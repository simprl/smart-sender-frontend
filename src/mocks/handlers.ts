import { http, HttpResponse } from 'msw';
import {
    WEBHOOKS_PAGE_SIZE,
    type ErrorEnvelope,
    ErrorType,
    HttpStatus,
    HttpMethod,
} from '@/api';
import { createWebhooks } from './data';
import { DEMO_EMAIL, DEMO_PASSWORD } from '@/demo';

type MockState = ReturnType<typeof createMockState>;

export const CSRF_TOKEN = 'smart-sender-demo-csrf';
const SESSION_TTL = 30_000;

const types: Record<number, ErrorType> = {
    [HttpStatus.BadRequest]: ErrorType.BadRequest,
    [HttpStatus.Unauthorized]: ErrorType.Authentication,
    [HttpStatus.NotFound]: ErrorType.NotFound,
    [HttpStatus.CsrfTokenMismatch]: ErrorType.TokenMismatch,
    [HttpStatus.UnprocessableEntity]: ErrorType.Validation,
};

export function createHandlers(state: MockState, baseUrl = '') {
    const path = (value: string) => `${baseUrl}${value}`;
    const protect = (request: Request) =>
        checkHeaders(request) ??
        (!state.sessionIssued || Date.now() >= state.expiresAt
            ? errorResponse(HttpStatus.Unauthorized)
            : undefined);

    return [
        http.get(
            path('/csrf'),
            ({ request }) =>
                checkHeaders(request) ??
                new HttpResponse(null, {
                    status: HttpStatus.NoContent,
                    headers: { 'X-CSRF-TOKEN': CSRF_TOKEN },
                }),
        ),

        http.post(path('/auth/login'), async ({ request }) => {
            const headerError = checkHeaders(request);
            if (headerError) {
                return headerError;
            }
            const body = await bodyOf(request);
            if (!validFingerprint(body.fingerprint)) {
                return errorResponse(HttpStatus.UnprocessableEntity, {
                    fingerprint: ['Некоректний ідентифікатор пристрою.'],
                });
            }
            if (!request.headers.get('X-Captcha-Token')?.trim()) {
                return errorResponse(HttpStatus.UnprocessableEntity, {
                    captcha: ['Підтвердіть перевірку.'],
                });
            }
            const fields: Record<string, string[]> = {};
            if (body.email !== DEMO_EMAIL) {
                fields.email = ['Користувача з такою адресою не знайдено.'];
            }
            if (body.password !== DEMO_PASSWORD) {
                fields.password = ['Неправильний пароль.'];
            }
            if (Object.keys(fields).length) {
                return errorResponse(HttpStatus.UnprocessableEntity, fields);
            }
            state.deviceToken = crypto.randomUUID();
            state.fingerprint = body.fingerprint;
            return HttpResponse.json({
                device_session_token: state.deviceToken,
            });
        }),

        http.post(path('/auth/token/issue'), async ({ request }) => {
            const headerError = checkHeaders(request);
            if (headerError) {
                return headerError;
            }
            const body = await bodyOf(request);
            if (
                !state.deviceToken ||
                body.device_session_token !== state.deviceToken ||
                body.fingerprint !== state.fingerprint
            ) {
                return errorResponse(HttpStatus.UnprocessableEntity);
            }
            state.deviceToken = null;
            state.sessionIssued = true;
            state.expiresAt = Date.now() + SESSION_TTL;
            return HttpResponse.json({});
        }),

        http.post(path('/auth/token/rotate'), async ({ request }) => {
            const headerError = checkHeaders(request);
            if (headerError) {
                return headerError;
            }
            const body = await bodyOf(request);
            if (
                !state.sessionIssued ||
                !validFingerprint(body.fingerprint) ||
                body.fingerprint !== state.fingerprint
            ) {
                return errorResponse(HttpStatus.BadRequest);
            }
            state.expiresAt = Date.now() + SESSION_TTL;
            return HttpResponse.json({});
        }),

        http.post(path('/auth/token/revoke'), async ({ request }) => {
            const headerError = checkHeaders(request);
            if (headerError) {
                return headerError;
            }
            const body = await bodyOf(request);
            if (
                !validFingerprint(body.fingerprint) ||
                (state.fingerprint && body.fingerprint !== state.fingerprint)
            ) {
                return errorResponse(HttpStatus.BadRequest);
            }
            state.sessionIssued = false;
            state.expiresAt = 0;
            state.deviceToken = null;
            state.fingerprint = null;
            return new HttpResponse(null, { status: HttpStatus.NoContent });
        }),

        http.get(
            path('/v1/me'),
            ({ request }) =>
                protect(request) ??
                HttpResponse.json({
                    id: 1,
                    email: DEMO_EMAIL,
                    first_name: 'Олександр',
                    last_name: 'Демо',
                    name: 'Олександр Демо',
                }),
        ),

        http.get(path('/v1/webhooks'), ({ request }) => {
            const error = protect(request);
            if (error) {
                return error;
            }
            const params = new URL(request.url).searchParams;
            const requestedPage = Number(params.get('page') ?? '1');
            const page =
                Number.isSafeInteger(requestedPage) && requestedPage > 0
                    ? requestedPage
                    : 1;
            const search = (params.get('search') ?? '').toLocaleLowerCase('uk');
            const data = state.webhooks.filter((item) =>
                item.name.toLocaleLowerCase('uk').includes(search),
            );
            return HttpResponse.json({
                data: data.slice(
                    (page - 1) * WEBHOOKS_PAGE_SIZE,
                    page * WEBHOOKS_PAGE_SIZE,
                ),
                paging: {
                    pages: {
                        current: page,
                        last: Math.max(
                            1,
                            Math.ceil(data.length / WEBHOOKS_PAGE_SIZE),
                        ),
                    },
                    results: {
                        total: data.length,
                        limitation: WEBHOOKS_PAGE_SIZE,
                    },
                },
            });
        }),

        http.get(path('/v1/webhooks/:id'), ({ request, params }) => {
            const error = protect(request);
            if (error) {
                return error;
            }
            const webhook = state.webhooks.find(
                (item) => item.id === Number(params.id),
            );
            return webhook
                ? HttpResponse.json(webhook)
                : errorResponse(HttpStatus.NotFound);
        }),

        http.put(path('/v1/webhooks/:id'), async ({ request, params }) => {
            const error = protect(request);
            if (error) {
                return error;
            }
            const webhook = state.webhooks.find(
                (item) => item.id === Number(params.id),
            );
            if (!webhook) {
                return errorResponse(HttpStatus.NotFound);
            }
            const body = await bodyOf(request);
            const fields: Record<string, string[]> = {};
            if (typeof body.name !== 'string' || !body.name.trim()) {
                fields.name = ['Вкажіть назву вебхука.'];
            }
            try {
                const url = new URL(
                    typeof body.url === 'string' ? body.url : '',
                );
                if (!['http:', 'https:'].includes(url.protocol)) {
                    throw new Error();
                }
            } catch {
                fields.url = ['Вкажіть коректну HTTP або HTTPS адресу.'];
            }
            if (Object.keys(fields).length) {
                return errorResponse(HttpStatus.UnprocessableEntity, fields);
            }
            webhook.name = String(body.name).trim();
            webhook.url = String(body.url).trim();
            return HttpResponse.json(webhook);
        }),
    ];
}

export function createMockState() {
    return {
        webhooks: createWebhooks(),
        deviceToken: null as string | null,
        fingerprint: null as string | null,
        sessionIssued: false,
        expiresAt: 0,
    };
}

export function errorResponse(
    status: number,
    payload?: Record<string, string[]>,
) {
    return HttpResponse.json<ErrorEnvelope>(
        {
            error: {
                type: types[status] ?? ErrorType.BadRequest,
                message:
                    status === HttpStatus.UnprocessableEntity
                        ? 'The given data was invalid.'
                        : 'Request failed.',
                ...(payload ? { payload } : {}),
            },
        },
        { status },
    );
}

function checkHeaders(request: Request) {
    if (request.headers.get('X-Requested-With') !== 'XMLHttpRequest') {
        return errorResponse(HttpStatus.BadRequest);
    }
    if (
        (request.method === HttpMethod.Post ||
            request.method === HttpMethod.Put) &&
        request.headers.get('X-CSRF-TOKEN') !== CSRF_TOKEN
    ) {
        return errorResponse(HttpStatus.CsrfTokenMismatch);
    }
}

async function bodyOf(request: Request): Promise<Record<string, unknown>> {
    try {
        const data: unknown = await request.json();
        return data && typeof data === 'object' && !Array.isArray(data)
            ? (data as Record<string, unknown>)
            : {};
    } catch {
        return {};
    }
}

function validFingerprint(value: unknown): value is string {
    return typeof value === 'string' && /^[a-f0-9]{32}$/.test(value);
}
