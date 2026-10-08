import { HttpStatus, HttpMethod } from './http';
import { ApiFailure, parseError } from './errors';

interface RequestOptions {
    method?: HttpMethod;
    body?: unknown;
    headers?: Record<string, string>;
    protected?: boolean;
    signal?: AbortSignal;
}

interface ClientOptions {
    baseUrl: string;
    getFingerprint: () => string;
    onSessionExpired?: () => void;
}

/** Protocol state stays outside React and the application store. */
export function createApiClient(options: ClientOptions) {
    let csrf: string | undefined;
    let csrfFlight: Promise<void> | undefined;
    let rotateFlight: Promise<void> | undefined;
    let epoch = 0;
    let revision = 0;
    let isSessionActive = false;
    let onSessionExpired = options.onSessionExpired;

    function endSession() {
        epoch += 1;
        isSessionActive = false;
        rotateFlight = undefined;
    }

    function assertEpoch(expected: number) {
        if (epoch !== expected) {
            throw new ApiFailure({
                status: HttpStatus.ClientClosedRequest,
                message: 'Session changed; response discarded',
            });
        }
    }

    function expireSession(expected: number) {
        if (epoch !== expected) {
            return;
        }
        endSession();
        onSessionExpired?.();
    }

    async function ensureCsrf(): Promise<void> {
        if (csrf) {
            return;
        }
        if (!csrfFlight) {
            csrfFlight = (async () => {
                const response = await fetch(`${options.baseUrl}/csrf`, {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' },
                    credentials: 'include',
                });
                if (!response.ok) {
                    throw new ApiFailure(
                        parseError(response.status, await readBody(response)),
                    );
                }
                const token = response.headers.get('X-CSRF-TOKEN');
                if (!token) {
                    throw new ApiFailure({
                        status: HttpStatus.InternalServerError,
                        message: 'Missing CSRF response header',
                    });
                }
                csrf = token;
            })().finally(() => {
                csrfFlight = undefined;
            });
        }
        await csrfFlight;
    }

    async function send(
        path: string,
        request: RequestOptions,
    ): Promise<Response> {
        const method = request.method ?? HttpMethod.Get;
        const headers = new Headers(request.headers);
        headers.set('X-Requested-With', 'XMLHttpRequest');
        if (method === HttpMethod.Post || method === HttpMethod.Put) {
            headers.set('X-CSRF-TOKEN', csrf ?? '');
        }
        if (request.body !== undefined) {
            headers.set('Content-Type', 'application/json');
        }
        return fetch(`${options.baseUrl}${path}`, {
            method,
            headers,
            credentials: 'include',
            signal: request.signal,
            body:
                request.body === undefined
                    ? undefined
                    : JSON.stringify(request.body),
        });
    }

    /** Separate retry budgets: at most one CSRF recovery and one session recovery. */
    async function request<T>(
        path: string,
        input: RequestOptions = {},
    ): Promise<T> {
        const requestEpoch = epoch;
        let hasRetriedCsrf = false;
        let hasRetriedSession = false;
        await ensureCsrf();

        while (true) {
            if (input.protected) {
                assertEpoch(requestEpoch);
            }
            if (input.protected && rotateFlight) {
                await rotateFlight;
                assertEpoch(requestEpoch);
            }
            const sentCsrf = csrf;
            const sentRevision = revision;
            const response = await send(path, input);
            if (input.protected) {
                assertEpoch(requestEpoch);
            }

            if (
                response.status === HttpStatus.CsrfTokenMismatch &&
                !hasRetriedCsrf
            ) {
                hasRetriedCsrf = true;
                // Another request may already have refreshed the token.
                if (csrf === sentCsrf) {
                    csrf = undefined;
                }
                await ensureCsrf();
                continue;
            }

            if (
                response.status === HttpStatus.Unauthorized &&
                input.protected
            ) {
                if (hasRetriedSession || !isSessionActive) {
                    expireSession(requestEpoch);
                    throw new ApiFailure(
                        parseError(
                            HttpStatus.Unauthorized,
                            await readBody(response),
                        ),
                    );
                }
                hasRetriedSession = true;
                try {
                    // A late 401 from the previous revision reuses the completed rotation.
                    if (revision === sentRevision) {
                        await rotate(requestEpoch);
                    }
                    assertEpoch(requestEpoch);
                } catch (error) {
                    expireSession(requestEpoch);
                    throw error;
                }
                continue;
            }

            const body = await readBody(response);
            if (input.protected) {
                assertEpoch(requestEpoch);
            }
            if (!response.ok) {
                throw new ApiFailure(parseError(response.status, body));
            }
            return body as T;
        }
    }

    async function rotate(expectedEpoch: number): Promise<void> {
        if (!rotateFlight) {
            const flight = (async () => {
                // This request is deliberately unprotected: it can never rotate itself.
                await request('/auth/token/rotate', {
                    method: HttpMethod.Post,
                    body: { fingerprint: options.getFingerprint() },
                });
                assertEpoch(expectedEpoch);
                revision += 1;
            })();
            rotateFlight = flight;
            void flight
                .finally(() => {
                    if (rotateFlight === flight) {
                        rotateFlight = undefined;
                    }
                })
                .catch(() => {
                    /* The awaiting callers handle the original rejection. */
                });
        }
        await rotateFlight;
    }

    return {
        request,
        endSession,
        startSession() {
            endSession();
            isSessionActive = true;
            revision = 0;
        },
        setOnSessionExpired(handler: (() => void) | undefined) {
            onSessionExpired = handler;
        },
    };
}

async function readBody(response: Response): Promise<unknown> {
    if (response.status === HttpStatus.NoContent) {
        return undefined;
    }
    const text = await response.text();
    if (!text) {
        return undefined;
    }
    try {
        return JSON.parse(text) as unknown;
    } catch {
        throw new ApiFailure({
            status: response.status,
            message: 'Invalid JSON response',
        });
    }
}
