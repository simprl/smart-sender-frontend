import { memo, useEffect, useEffectEvent, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiClient, login, toRequestError } from '@/api';
import { appStore } from '@/store';

export const LoginActor = memo(function LoginActor() {
    const { state: sessionState } = appStore.session;
    const { state: loginState, useOnLogin, reset } = appStore.login;
    const { user } = sessionState.useValue();
    const loginStatus = loginState.useValue();
    const previousLogin = useRef(loginStatus);
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const loginRequest = useRef<AbortController | null>(null);

    loginState.useOnChange((next) => {
        const previous = previousLogin.current;
        previousLogin.current = next;
        if (
            next.error &&
            (next.email !== previous.email ||
                next.password !== previous.password)
        ) {
            loginState.set({ ...next, error: undefined });
        }
    });

    useOnLogin(async () => {
        if (user || loginRequest.current) {
            return;
        }
        const { email, password } = previousLogin.current;
        const credentials = { email, password };
        const controller = new AbortController();
        loginRequest.current = controller;
        loginState.set({
            ...previousLogin.current,
            pending: true,
            error: undefined,
        });
        try {
            const authenticatedUser = await login(
                credentials,
                controller.signal,
            );
            if (controller.signal.aborted) {
                return;
            }
            loginRequest.current = null;
            reset();
            sessionState.set({
                user: authenticatedUser,
                reason: null,
                logoutPending: false,
            });
            if (!/^\/webhooks(?:\/[^/]+\/edit)?\/?$/.test(pathname)) {
                void navigate('/webhooks', { replace: true });
            }
        } catch (cause) {
            if (!controller.signal.aborted) {
                loginState.set({
                    ...previousLogin.current,
                    pending: false,
                    error: toRequestError(cause),
                });
            }
        } finally {
            if (loginRequest.current === controller) {
                loginRequest.current = null;
            }
        }
    });

    const cancelLogin = useEffectEvent(() => {
        if (loginRequest.current) {
            loginRequest.current.abort();
            loginRequest.current = null;
            if (!user) {
                apiClient.endSession();
            }
        }
        reset();
    });

    useEffect(() => cancelLogin, [user]);
    return null;
});
