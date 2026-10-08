// @vitest-environment jsdom
import { StrictMode } from 'react';
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appStore, NotificationType, SessionEndReason } from '@/store';
import { apiClient, login, logout, type User, HttpStatus } from '@/api';
import { ApiFailure } from '@/api/errors';
import { LoginActor, SessionActor } from '@/actors';
import { LoginPage } from '@ui/pages';
import { DEMO_EMAIL, DEMO_PASSWORD } from '@/demo';

vi.mock('@/api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/api')>()),
    login: vi.fn(),
    logout: vi.fn(),
}));

const user: User = {
    id: 1,
    name: 'Demo',
    email: 'demo@example.com',
    first_name: 'Demo',
    last_name: '',
};
const credentials = { email: user.email, password: 'password' };
function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((done, fail) => {
        resolve = done;
        reject = fail;
    });
    return { promise, resolve, reject };
}
function loginWithCredentials() {
    appStore.login.state.set({ ...appStore.login.state.get(), ...credentials });
    appStore.login.login();
}
function authenticate(nextUser = user) {
    appStore.session.state.set({
        user: nextUser,
        reason: null,
        logoutPending: false,
    });
}
function Location() {
    const location = useLocation();
    return (
        <output aria-label="location">
            {location.pathname}
            {location.search}
        </output>
    );
}
function renderLogin(path = '/') {
    return render(
        <StrictMode>
            <MemoryRouter initialEntries={[path]}>
                <LoginActor />
                <Location />
            </MemoryRouter>
        </StrictMode>,
    );
}
beforeEach(() => {
    appStore.clearSession();
    vi.mocked(login).mockReset().mockResolvedValue(user);
    vi.mocked(logout).mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
    cleanup();
    appStore.clearSession();
});

describe('LoginActor component', () => {
    it('preserves current fields when a pending login fails', async () => {
        const result = deferred<User>();
        vi.mocked(login).mockReturnValue(result.promise);
        renderLogin();
        act(() => loginWithCredentials());
        act(() =>
            appStore.login.state.set({
                ...appStore.login.state.get(),
                password: 'new-value',
            }),
        );
        const error = {
            status: HttpStatus.UnprocessableEntity,
            message: 'Invalid',
            fields: { password: ['Wrong'] },
        };
        await act(async () => {
            result.reject(new ApiFailure(error));
            await result.promise.catch(() => undefined);
        });
        expect(appStore.login.state.get()).toMatchObject({
            email: credentials.email,
            password: 'new-value',
            pending: false,
            error,
        });
    });

    it('clears a login error on field changes and preserves the other field', async () => {
        vi.mocked(login).mockRejectedValueOnce(
            new ApiFailure({
                status: HttpStatus.UnprocessableEntity,
                message: 'Invalid',
                fields: { password: ['Wrong'] },
            }),
        );
        render(
            <StrictMode>
                <MemoryRouter>
                    <LoginActor />
                    <LoginPage />
                </MemoryRouter>
            </StrictMode>,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Заповнити дані' }));
        fireEvent.click(screen.getByRole('button', { name: 'Увійти' }));
        await screen.findByText('Wrong');
        fireEvent.change(screen.getByLabelText(/^Пароль/), {
            target: { value: 'corrected-password' },
        });
        expect(appStore.login.state.get()).toMatchObject({
            email: DEMO_EMAIL,
            password: 'corrected-password',
            pending: false,
        });
        expect(appStore.login.state.get().error).toBeUndefined();
        expect(screen.queryByText('Wrong')).toBeNull();
    });

    it('stores login fields from the UI and clears credentials after authentication', async () => {
        render(
            <MemoryRouter>
                <LoginActor />
                <LoginPage />
            </MemoryRouter>,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Заповнити дані' }));
        expect(appStore.login.state.get()).toMatchObject({
            email: DEMO_EMAIL,
            password: DEMO_PASSWORD,
        });
        fireEvent.change(screen.getByLabelText(/^Email/), {
            target: { value: 'reviewer@example.com' },
        });
        expect(appStore.login.state.get()).toMatchObject({
            email: 'reviewer@example.com',
            password: DEMO_PASSWORD,
        });
        fireEvent.click(screen.getByRole('button', { name: 'Увійти' }));
        await waitFor(() =>
            expect(appStore.session.state.get().user).toEqual(user),
        );
        expect(login).toHaveBeenCalledWith(
            { email: 'reviewer@example.com', password: DEMO_PASSWORD },
            expect.any(AbortSignal),
        );
        expect(appStore.login.state.get()).toMatchObject({
            email: '',
            password: '',
        });
    });

    it('handles one login while mounted and preserves a requested URL', async () => {
        const result = deferred<User>();
        vi.mocked(login).mockReturnValue(result.promise);
        loginWithCredentials();
        const view = renderLogin('/webhooks?page=2');
        expect(appStore.login.state.get().pending).toBe(false);
        act(() => {
            loginWithCredentials();
            loginWithCredentials();
        });
        expect(appStore.login.state.get().pending).toBe(true);
        expect(login).toHaveBeenCalledTimes(1);
        await act(async () => {
            result.resolve(user);
            await result.promise;
        });
        expect(appStore.session.state.get().user).toEqual(user);
        expect(appStore.login.state.get().pending).toBe(false);
        expect(screen.getByLabelText('location').textContent).toBe(
            '/webhooks?page=2',
        );
        view.unmount();
        loginWithCredentials();
        expect(login).toHaveBeenCalledTimes(1);
    });

    it('reacts to an externally changed session and cancels the pending login', async () => {
        const result = deferred<User>();
        vi.mocked(login).mockReturnValue(result.promise);
        renderLogin();
        act(() => loginWithCredentials());
        const signal = vi.mocked(login).mock.calls[0]?.[1];
        act(() => authenticate({ ...user, id: 2 }));
        expect(signal?.aborted).toBe(true);
        await act(async () => {
            result.resolve(user);
            await result.promise;
        });
        expect(appStore.session.state.get().user?.id).toBe(2);
    });

    it('publishes field errors and accepts a retry', async () => {
        vi.mocked(login).mockRejectedValueOnce(
            new ApiFailure({
                status: HttpStatus.UnprocessableEntity,
                message: 'Invalid',
                fields: { password: ['Wrong'] },
            }),
        );
        renderLogin();
        act(() => loginWithCredentials());
        await waitFor(() =>
            expect(appStore.login.state.get().error?.fields?.password).toEqual([
                'Wrong',
            ]),
        );
        act(() => {
            appStore.login.state.set({
                ...appStore.login.state.get(),
                password: 'retry-password',
            });
            loginWithCredentials();
        });
        await waitFor(() =>
            expect(appStore.session.state.get().user).toEqual(user),
        );
        expect(screen.getByLabelText('location').textContent).toBe('/webhooks');
    });

    it('aborts an unmounted login and ignores its late result', async () => {
        const result = deferred<User>();
        vi.mocked(login).mockReturnValue(result.promise);
        const view = renderLogin();
        act(() => loginWithCredentials());
        const signal = vi.mocked(login).mock.calls[0]?.[1];
        view.unmount();
        expect(signal?.aborted).toBe(true);
        expect(appStore.login.state.get()).toMatchObject({
            email: '',
            password: '',
        });
        await act(async () => {
            result.resolve(user);
            await result.promise;
        });
        expect(appStore.session.state.get().user).toBeNull();
        expect(appStore.login.state.get().pending).toBe(false);
    });
});

describe('SessionActor component', () => {
    it('clears notifications immediately and signs out even if revoke fails', async () => {
        authenticate();
        appStore.notificationState.set(NotificationType.WebhookSaved);
        vi.mocked(logout).mockRejectedValue(new Error('Offline'));
        render(
            <StrictMode>
                <SessionActor />
            </StrictMode>,
        );
        act(() => {
            appStore.session.logout();
            appStore.session.logout();
        });
        expect(appStore.notificationState.get()).toBeNull();
        expect(logout).toHaveBeenCalledTimes(1);
        await waitFor(() =>
            expect(appStore.session.state.get()).toEqual({
                user: null,
                reason: SessionEndReason.LogoutFailed,
                logoutPending: false,
            }),
        );
    });

    it('registers expiration only for the mounted authenticated session', () => {
        authenticate();
        const register = vi.spyOn(apiClient, 'setOnSessionExpired');
        const view = render(
            <StrictMode>
                <SessionActor />
            </StrictMode>,
        );
        const expired = register.mock.calls.at(-1)?.[0];
        expect(expired).toBeTypeOf('function');
        act(() => expired?.());
        expect(appStore.session.state.get().reason).toBe(
            SessionEndReason.Expired,
        );
        view.unmount();
        expect(register.mock.calls.at(-1)?.[0]).toBeUndefined();
        act(() => {
            authenticate();
            expired?.();
        });
        expect(appStore.session.state.get().user).toEqual(user);
    });

    it('cancels logout when the session actor unmounts', async () => {
        authenticate();
        const result = deferred<void>();
        vi.mocked(logout).mockReturnValue(result.promise);
        const view = render(<SessionActor />);
        act(() => appStore.session.logout());
        const signal = vi.mocked(logout).mock.calls[0]?.[0];
        view.unmount();
        expect(signal?.aborted).toBe(true);
        expect(appStore.session.state.get().user).toBeNull();
        await act(async () => {
            result.resolve();
            await result.promise;
        });
        appStore.session.logout();
        expect(logout).toHaveBeenCalledTimes(1);
    });
});
