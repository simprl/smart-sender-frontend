import {
    HttpStatus,
    HttpMethod,
    type User,
    type Webhook,
    type WebhookList,
} from '@/api';
import {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { createApiClient } from '@/api/client';
import {
    createHandlers,
    createMockState,
    CSRF_TOKEN,
    errorResponse,
} from '@/mocks';
import { DEMO_EMAIL, DEMO_PASSWORD } from '@/demo';

const baseUrl = 'http://localhost:3000';
const fingerprint = '0123456789abcdef0123456789abcdef';
const state = createMockState();
const server = setupServer(...createHandlers(state, baseUrl));
let client: ReturnType<typeof createApiClient>;
let expired = vi.fn();

function deferred() {
    let resolve!: () => void;
    const promise = new Promise<void>((done) => {
        resolve = done;
    });
    return { promise, resolve };
}

async function signIn() {
    const result = await client.request<{ device_session_token: string }>(
        '/auth/login',
        {
            method: HttpMethod.Post,
            headers: { 'X-Captcha-Token': 'test' },
            body: { email: DEMO_EMAIL, password: DEMO_PASSWORD, fingerprint },
        },
    );
    await client.request('/auth/token/issue', {
        method: HttpMethod.Post,
        body: {
            device_session_token: result.device_session_token,
            fingerprint,
        },
    });
    client.startSession();
}

function countRotations() {
    const count = { value: 0 };
    server.events.on('request:start', ({ request }) => {
        if (new URL(request.url).pathname === '/auth/token/rotate') {
            count.value += 1;
        }
    });
    return count;
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
    Object.assign(state, createMockState());
    expired = vi.fn();
    client = createApiClient({
        baseUrl,
        getFingerprint: () => fingerprint,
        onSessionExpired: expired,
    });
});
afterEach(() => {
    server.resetHandlers();
    server.events.removeAllListeners();
});
afterAll(() => server.close());

describe('session recovery', () => {
    it('expires after 30 seconds and rotation grants another 30 seconds', async () => {
        const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
        try {
            await signIn();
            const rotations = countRotations();
            now.mockReturnValue(1_029_999);
            await client.request('/v1/me', { protected: true });
            expect(rotations.value).toBe(0);
            now.mockReturnValue(1_030_000);
            await client.request('/v1/me', { protected: true });
            expect(rotations.value).toBe(1);
            now.mockReturnValue(1_059_999);
            await client.request('/v1/me', { protected: true });
            expect(rotations.value).toBe(1);
            now.mockReturnValue(1_060_000);
            await client.request('/v1/me', { protected: true });
            expect(rotations.value).toBe(2);
            expect(expired).not.toHaveBeenCalled();
        } finally {
            now.mockRestore();
        }
    });

    it('two parallel 401 responses share one rotate and both requests retry successfully', async () => {
        await signIn();
        state.expiresAt = 0;
        const rotations = countRotations();
        const bothArrived = deferred();
        let firstAttempts = 0;
        const attempts = new Map<string, number>();
        const user = { id: 1, email: DEMO_EMAIL };

        server.use(
            http.get(`${baseUrl}/v1/:resource`, async ({ params }) => {
                const resource = String(params.resource);
                const attempt = (attempts.get(resource) ?? 0) + 1;
                attempts.set(resource, attempt);
                if (attempt === 1) {
                    firstAttempts += 1;
                    if (firstAttempts === 2) {
                        bothArrived.resolve();
                    }
                    await bothArrived.promise;
                    return errorResponse(HttpStatus.Unauthorized);
                }
                if (Date.now() >= state.expiresAt) {
                    return errorResponse(HttpStatus.Unauthorized);
                }
                return HttpResponse.json(
                    resource === 'me'
                        ? user
                        : { data: state.webhooks.slice(0, 10) },
                );
            }),
        );

        const [me, webhooks] = await Promise.all([
            client.request<User>('/v1/me', { protected: true }),
            client.request<WebhookList>('/v1/webhooks', { protected: true }),
        ]);

        expect(firstAttempts).toBe(2);
        expect(rotations.value).toBe(1);
        expect(attempts.get('me')).toBe(2);
        expect(attempts.get('webhooks')).toBe(2);
        expect(me.email).toBe(DEMO_EMAIL);
        expect(webhooks.data).toHaveLength(10);
        expect(expired).not.toHaveBeenCalled();
    });

    it('a delayed old 401 reuses the rotation that has already completed', async () => {
        await signIn();
        state.expiresAt = 0;
        const rotations = countRotations();
        const arrived = deferred();
        const release = deferred();
        let attempts = 0;
        server.use(
            http.get(`${baseUrl}/v1/webhooks`, async () => {
                attempts += 1;
                if (attempts === 1) {
                    arrived.resolve();
                    await release.promise;
                    return errorResponse(HttpStatus.Unauthorized);
                }
                return HttpResponse.json({ data: [] });
            }),
        );
        const delayed = client.request('/v1/webhooks', { protected: true });
        await arrived.promise;
        await client.request('/v1/me', { protected: true });
        release.resolve();
        await delayed;
        expect(rotations.value).toBe(1);
        expect(attempts).toBe(2);
    });

    it('expires local state once when the shared rotate fails', async () => {
        await signIn();
        state.sessionIssued = false;
        const rotations = countRotations();
        const results = await Promise.allSettled([
            client.request('/v1/me', { protected: true }),
            client.request('/v1/webhooks', { protected: true }),
        ]);
        expect(results.every((result) => result.status === 'rejected')).toBe(
            true,
        );
        expect(rotations.value).toBe(1);
        expect(expired).toHaveBeenCalledTimes(1);
    });

    it('does not recursively rotate when rotate itself returns 401', async () => {
        await signIn();
        state.expiresAt = 0;
        const rotations = countRotations();
        server.use(
            http.post(`${baseUrl}/auth/token/rotate`, () =>
                errorResponse(HttpStatus.Unauthorized),
            ),
        );
        await expect(
            client.request('/v1/me', { protected: true }),
        ).rejects.toMatchObject({
            detail: { status: HttpStatus.Unauthorized },
        });
        expect(rotations.value).toBe(1);
        expect(expired).toHaveBeenCalledTimes(1);
    });

    it('ends the session on a second 401 without a second rotate', async () => {
        await signIn();
        const rotations = countRotations();
        let attempts = 0;
        server.use(
            http.get(`${baseUrl}/v1/me`, () => {
                attempts += 1;
                return errorResponse(HttpStatus.Unauthorized);
            }),
        );
        await expect(
            client.request('/v1/me', { protected: true }),
        ).rejects.toMatchObject({
            detail: { status: HttpStatus.Unauthorized },
        });
        expect(attempts).toBe(2);
        expect(rotations.value).toBe(1);
        expect(expired).toHaveBeenCalledTimes(1);
    });

    it('discards an in-flight response after logout', async () => {
        await signIn();
        const arrived = deferred();
        const release = deferred();
        server.use(
            http.get(`${baseUrl}/v1/me`, async () => {
                arrived.resolve();
                await release.promise;
                return HttpResponse.json({ id: 1 });
            }),
        );
        const pending = client.request('/v1/me', { protected: true });
        const assertion = expect(pending).rejects.toMatchObject({
            detail: { status: HttpStatus.ClientClosedRequest },
        });
        await arrived.promise;
        client.endSession();
        release.resolve();
        await assertion;
    });
});

describe('CSRF and API contract', () => {
    it('gets CSRF once before concurrent initial requests and sends required headers', async () => {
        let csrfCalls = 0;
        const sequence: string[] = [];
        server.events.on('request:start', ({ request }) => {
            sequence.push(new URL(request.url).pathname);
            expect(request.headers.get('X-Requested-With')).toBe(
                'XMLHttpRequest',
            );
            if (request.method === 'POST') {
                expect(request.headers.get('X-CSRF-TOKEN')).toBe(CSRF_TOKEN);
            }
        });
        server.use(
            http.get(`${baseUrl}/csrf`, () => {
                csrfCalls += 1;
                return new HttpResponse(null, {
                    status: HttpStatus.NoContent,
                    headers: { 'X-CSRF-TOKEN': CSRF_TOKEN },
                });
            }),
        );
        await Promise.allSettled([
            client.request('/auth/token/rotate', {
                method: HttpMethod.Post,
                body: { fingerprint },
            }),
            client.request('/auth/token/revoke', {
                method: HttpMethod.Post,
                body: { fingerprint },
            }),
        ]);
        expect(csrfCalls).toBe(1);
        expect(sequence[0]).toBe('/csrf');
    });

    it('refreshes CSRF on 419 and retries only once', async () => {
        let attempts = 0;
        let csrfCalls = 0;
        server.events.on('request:start', ({ request }) => {
            if (new URL(request.url).pathname === '/csrf') {
                csrfCalls += 1;
            }
        });
        server.use(
            http.post(`${baseUrl}/auth/token/revoke`, () => {
                attempts += 1;
                return errorResponse(HttpStatus.CsrfTokenMismatch);
            }),
        );
        await expect(
            client.request('/auth/token/revoke', {
                method: HttpMethod.Post,
                body: { fingerprint },
            }),
        ).rejects.toMatchObject({
            detail: { status: HttpStatus.CsrfTokenMismatch },
        });
        expect(attempts).toBe(2);
        expect(csrfCalls).toBe(2);
    });

    it('recovers successfully after a single 419', async () => {
        let attempts = 0;
        server.use(
            http.post(`${baseUrl}/auth/token/revoke`, () => {
                attempts += 1;
                return attempts === 1
                    ? errorResponse(HttpStatus.CsrfTokenMismatch)
                    : new HttpResponse(null, { status: HttpStatus.NoContent });
            }),
        );
        await expect(
            client.request('/auth/token/revoke', {
                method: HttpMethod.Post,
                body: { fingerprint },
            }),
        ).resolves.toBeUndefined();
        expect(attempts).toBe(2);
    });

    it('returns field errors for invalid login and invalid webhook edits', async () => {
        await expect(
            client.request('/auth/login', {
                method: HttpMethod.Post,
                headers: { 'X-Captcha-Token': 'test' },
                body: { email: DEMO_EMAIL, password: 'wrong', fingerprint },
            }),
        ).rejects.toMatchObject({
            detail: {
                status: HttpStatus.UnprocessableEntity,
                fields: { password: expect.any(Array) },
            },
        });
        await signIn();
        await expect(
            client.request('/v1/webhooks/1', {
                method: HttpMethod.Put,
                protected: true,
                body: { name: ' ', url: 'ftp://example.com' },
            }),
        ).rejects.toMatchObject({
            detail: {
                status: HttpStatus.UnprocessableEntity,
                fields: { name: expect.any(Array), url: expect.any(Array) },
            },
        });
    });

    it('filters before paginating and persists an edit in mock memory', async () => {
        await signIn();
        const page = await client.request<WebhookList>(
            '/v1/webhooks?page=3&limit=10&search=',
            { protected: true },
        );
        expect(page.data).toHaveLength(8);
        expect(page.paging).toEqual({
            pages: { current: 3, last: 3 },
            results: { total: 28, limitation: 10 },
        });
        const saved = await client.request<Webhook>('/v1/webhooks/1', {
            method: HttpMethod.Put,
            protected: true,
            body: {
                name: '  Тестовий вебхук  ',
                url: 'https://example.com/new',
            },
        });
        expect(saved.name).toBe('Тестовий вебхук');
        const found = await client.request<WebhookList>(
            `/v1/webhooks?page=1&limit=10&search=${encodeURIComponent('ТЕСТОВИЙ')}`,
            { protected: true },
        );
        expect(found.paging.results.total).toBe(1);
        expect(found.data[0]).toEqual(saved);
    });

    it('the mock rejects rotation before issue and after revoke', async () => {
        await expect(
            client.request('/auth/token/rotate', {
                method: HttpMethod.Post,
                body: { fingerprint },
            }),
        ).rejects.toMatchObject({ detail: { status: HttpStatus.BadRequest } });
        await signIn();
        await client.request('/auth/token/revoke', {
            method: HttpMethod.Post,
            body: { fingerprint },
        });
        await expect(
            client.request('/auth/token/rotate', {
                method: HttpMethod.Post,
                body: { fingerprint },
            }),
        ).rejects.toMatchObject({ detail: { status: HttpStatus.BadRequest } });
    });

    it('the mock checks CSRF before mutating data', async () => {
        await signIn();
        const response = await fetch(`${baseUrl}/v1/webhooks/1`, {
            method: HttpMethod.Put,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: 'Changed',
                url: 'https://example.com/changed',
            }),
        });
        expect(response.status).toBe(HttpStatus.CsrfTokenMismatch);
        expect(state.webhooks[0]?.name).toBe('Нове замовлення');
    });
});
