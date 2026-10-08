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
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { createHandlers, createMockState } from '@/mocks';
import {
    apiClient,
    getWebhooks,
    getWebhook,
    updateWebhook,
    type User,
    type Webhook,
    type WebhookList,
    type WebhookInput,
    HttpStatus,
} from '@/api';
import {
    getWebhooks as fetchList,
    getWebhook as fetchItem,
    updateWebhook as putItem,
} from '@/api/webhooks';
import {
    appStore,
    listKey,
    EMPTY_RESOURCE,
    NotificationType,
    SaveStatus,
} from '@/store';
import { WebhooksActor, EditWebhookActor } from '@/actors';
import { App } from '@/App';
import { getFingerprint } from '@/api/fingerprint';

const { baseUrl, fingerprint } = vi.hoisted(() => ({
    baseUrl: 'http://actors.test',
    fingerprint: '0123456789abcdef0123456789abcdef',
}));
vi.mock('@/api/runtime', async () => {
    const { createApiClient } = await import('@/api/client');
    return {
        apiClient: createApiClient({
            baseUrl,
            getFingerprint: () => fingerprint,
        }),
    };
});
vi.mock('@/api', async (importOriginal) => {
    const original = await importOriginal<typeof import('@/api')>();
    return {
        ...original,
        getWebhooks: vi.fn(original.getWebhooks),
        getWebhook: vi.fn(original.getWebhook),
        updateWebhook: vi.fn(original.updateWebhook),
    };
});
const mock = createMockState();
const server = setupServer(...createHandlers(mock, baseUrl));
const user: User = {
    id: 1,
    name: 'Demo',
    email: 'demo@example.com',
    first_name: 'Demo',
    last_name: '',
};
function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((done) => {
        resolve = done;
    });
    return { promise, resolve };
}
function list(id: number): WebhookList {
    return {
        data: [mock.webhooks[id - 1]!],
        paging: {
            pages: { current: 1, last: 1 },
            results: { total: 1, limitation: 10 },
        },
    };
}
function changeWebhook(input: WebhookInput) {
    const resource = appStore.webhook.state.get();
    if (resource.data) {
        appStore.webhook.state.set({
            ...resource,
            data: { ...resource.data, ...input },
        });
    }
}
function saveWebhook(input: WebhookInput) {
    changeWebhook(input);
    appStore.webhook.save();
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
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
    Object.assign(mock, createMockState(), {
        fingerprint,
        sessionIssued: true,
        expiresAt: Date.now() + 30_000,
    });
    appStore.clearSession();
    appStore.session.state.set({ user, reason: null, logoutPending: false });
    apiClient.startSession();
    vi.mocked(getWebhooks).mockReset().mockImplementation(fetchList);
    vi.mocked(getWebhook).mockReset().mockImplementation(fetchItem);
    vi.mocked(updateWebhook).mockReset().mockImplementation(putItem);
});
afterEach(() => {
    cleanup();
    appStore.clearSession();
    apiClient.endSession();
    server.resetHandlers();
});
afterAll(() => server.close());

describe('WebhooksActor component', () => {
    it('calculates the visible range using the page size returned by the API', async () => {
        server.use(
            http.get(`${baseUrl}/v1/webhooks`, () =>
                HttpResponse.json<WebhookList>({
                    data: mock.webhooks.slice(5, 10),
                    paging: {
                        pages: { current: 2, last: 6 },
                        results: { total: 26, limitation: 5 },
                    },
                }),
            ),
        );
        render(
            <MemoryRouter initialEntries={['/webhooks?page=2']}>
                <App />
            </MemoryRouter>,
        );
        expect(await screen.findByText('6–10 із 26')).toBeTruthy();
    });

    it('ends the protocol session once and revokes access through the logout API', async () => {
        mock.fingerprint = getFingerprint();
        render(
            <MemoryRouter initialEntries={['/webhooks']}>
                <App />
            </MemoryRouter>,
        );
        await screen.findByRole('link', { name: 'Нове замовлення' });
        const endSession = vi.spyOn(apiClient, 'endSession');
        fireEvent.click(screen.getByRole('button', { name: 'Вийти' }));
        await screen.findByRole('button', { name: 'Увійти' });
        expect(mock.sessionIssued).toBe(false);
        expect(appStore.session.state.get().reason).toBeNull();
        expect(endSession).toHaveBeenCalledTimes(1);
    });

    it('loads the requested page and resets it on search through the real UI', async () => {
        render(
            <StrictMode>
                <MemoryRouter initialEntries={['/webhooks?page=2']}>
                    <App />
                    <Location />
                </MemoryRouter>
            </StrictMode>,
        );
        await waitFor(() =>
            expect(appStore.webhooks.state.get().data?.data[0]?.id).toBe(11),
        );
        fireEvent.change(
            screen.getByRole('searchbox', { name: 'Пошук за назвою' }),
            { target: { value: 'Telegram' } },
        );
        expect(appStore.webhooks.searchState.get()).toBe('Telegram');
        await waitFor(() =>
            expect(appStore.webhooks.state.get().data?.data[0]?.id).toBe(6),
        );
        expect(appStore.webhooks.state.get().data?.data).toHaveLength(1);
        expect(screen.getByLabelText('location').textContent).toBe(
            '/webhooks?page=1&search=Telegram',
        );
    });

    it('reacts to logout while still mounted and cancels the pending request', async () => {
        const result = deferred<WebhookList>();
        vi.mocked(getWebhooks).mockReturnValue(result.promise);
        render(
            <MemoryRouter>
                <WebhooksActor page={1} search="" query="" />
            </MemoryRouter>,
        );
        const signal = vi.mocked(getWebhooks).mock.calls[0]?.[1];
        act(() => {
            appStore.session.state.set({
                user,
                reason: null,
                logoutPending: true,
            });
        });
        expect(signal?.aborted).toBe(true);
        await act(async () => {
            result.resolve(list(1));
            await result.promise;
        });
        expect(appStore.webhooks.state.get().data).toBeUndefined();
    });

    it('cancels the previous page and ignores its late response', async () => {
        const first = deferred<WebhookList>();
        vi.mocked(getWebhooks)
            .mockReturnValueOnce(first.promise)
            .mockResolvedValueOnce(list(11));
        const view = render(
            <MemoryRouter>
                <WebhooksActor page={1} search="" query="?page=1" />
            </MemoryRouter>,
        );
        const signal = vi.mocked(getWebhooks).mock.calls[0]?.[1];
        view.rerender(
            <MemoryRouter>
                <WebhooksActor page={2} search="" query="?page=2" />
            </MemoryRouter>,
        );
        await waitFor(() =>
            expect(appStore.webhooks.state.get().data?.data[0]?.id).toBe(11),
        );
        expect(signal?.aborted).toBe(true);
        await act(async () => {
            first.resolve(list(1));
            await first.promise;
        });
        expect(appStore.webhooks.state.get().key).toBe(
            listKey({ page: 2, search: '' }),
        );
        expect(appStore.webhooks.state.get().data?.data[0]?.id).toBe(11);
    });

    it('supersedes refresh requests and removes the subscription on unmount', async () => {
        vi.mocked(getWebhooks).mockResolvedValueOnce(list(1));
        const view = render(
            <MemoryRouter>
                <WebhooksActor page={1} search="" query="" />
            </MemoryRouter>,
        );
        await waitFor(() =>
            expect(appStore.webhooks.state.get().data).toBeDefined(),
        );
        const first = deferred<WebhookList>();
        vi.mocked(getWebhooks)
            .mockReturnValueOnce(first.promise)
            .mockResolvedValueOnce(list(11));
        act(() => appStore.webhooks.refresh());
        const signal = vi.mocked(getWebhooks).mock.calls[1]?.[1];
        act(() => appStore.webhooks.refresh());
        await waitFor(() =>
            expect(appStore.webhooks.state.get().data?.data[0]?.id).toBe(11),
        );
        expect(signal?.aborted).toBe(true);
        await act(async () => {
            first.resolve(list(1));
            await first.promise;
        });
        expect(appStore.webhooks.state.get().data?.data[0]?.id).toBe(11);
        view.unmount();
        expect(appStore.webhooks.state.get()).toEqual(EMPTY_RESOURCE);
        expect(appStore.webhooks.refreshState.get()).toBe(0);
        expect(appStore.webhooks.searchState.get()).toBe('');
        appStore.webhooks.refresh();
        expect(appStore.webhooks.state.get().pending).toBe(false);
        expect(getWebhooks).toHaveBeenCalledTimes(3);
    });
});

describe('EditWebhookActor component', () => {
    it('clears editor data and refresh state on unmount', async () => {
        const view = render(
            <MemoryRouter>
                <EditWebhookActor id={1} />
            </MemoryRouter>,
        );
        await waitFor(() =>
            expect(appStore.webhook.state.get().data?.id).toBe(1),
        );
        act(() => appStore.webhook.refresh());
        await waitFor(() =>
            expect(appStore.webhook.state.get().pending).toBe(false),
        );
        view.unmount();
        expect(appStore.webhook.state.get()).toEqual(EMPTY_RESOURCE);
        expect(appStore.webhook.refreshState.get()).toBe(0);
        expect(appStore.webhook.saveState.get()).toEqual({
            id: null,
            status: SaveStatus.Idle,
        });
    });

    it('edits the webhook in the store and saves current store values through the UI', async () => {
        render(
            <MemoryRouter initialEntries={['/webhooks/11/edit']}>
                <App />
            </MemoryRouter>,
        );
        const name = await screen.findByRole('textbox', { name: /^Назва/ });
        fireEvent.change(name, { target: { value: 'Store value' } });
        expect(appStore.webhook.state.get().data?.name).toBe('Store value');
        fireEvent.change(screen.getByRole('textbox', { name: /^URL/ }), {
            target: { value: 'https://example.org/store-value' },
        });
        expect(appStore.webhook.state.get().data?.url).toBe(
            'https://example.org/store-value',
        );
        fireEvent.click(screen.getByRole('button', { name: 'Зберегти зміни' }));
        await screen.findByText('Зміни збережено.');
        expect(mock.webhooks[10]).toMatchObject({
            name: 'Store value',
            url: 'https://example.org/store-value',
        });
    });

    it('reloads server values after cancelling changes stored in the editor', async () => {
        const originalName = mock.webhooks[10]!.name;
        render(
            <MemoryRouter
                initialEntries={[
                    {
                        pathname: '/webhooks/11/edit',
                        state: { returnTo: '/webhooks?page=2' },
                    },
                ]}
            >
                <App />
            </MemoryRouter>,
        );
        fireEvent.change(
            await screen.findByRole('textbox', { name: /^Назва/ }),
            {
                target: { value: 'Unsaved' },
            },
        );
        expect(appStore.webhook.state.get().data?.name).toBe('Unsaved');
        fireEvent.click(screen.getByRole('link', { name: 'Скасувати' }));
        fireEvent.click(
            await screen.findByRole('link', { name: originalName }),
        );
        expect(
            await screen.findByRole('textbox', { name: /^Назва/ }),
        ).toHaveProperty('value', originalName);
        expect(mock.webhooks[10]!.name).toBe(originalName);
    });

    it('does not load or save without a valid id', () => {
        render(
            <StrictMode>
                <MemoryRouter>
                    <EditWebhookActor id={null} />
                </MemoryRouter>
            </StrictMode>,
        );
        act(() => {
            appStore.webhook.refresh();
            saveWebhook({ name: 'Ignored', url: 'https://example.org' });
        });
        expect(getWebhook).not.toHaveBeenCalled();
        expect(updateWebhook).not.toHaveBeenCalled();
        expect(appStore.webhook.state.get().pending).toBe(false);
    });

    it('cancels loading when id becomes invalid and resumes for a valid id', async () => {
        const result = deferred<Webhook>();
        vi.mocked(getWebhook)
            .mockReturnValueOnce(result.promise)
            .mockResolvedValueOnce(mock.webhooks[1]!);
        const view = render(
            <MemoryRouter>
                <EditWebhookActor id={1} />
            </MemoryRouter>,
        );
        const signal = vi.mocked(getWebhook).mock.calls[0]?.[1];
        view.rerender(
            <MemoryRouter>
                <EditWebhookActor id={null} />
            </MemoryRouter>,
        );
        expect(signal?.aborted).toBe(true);
        act(() => appStore.webhook.refresh());
        expect(getWebhook).toHaveBeenCalledTimes(1);
        await act(async () => {
            result.resolve(mock.webhooks[0]!);
            await result.promise;
        });
        expect(appStore.webhook.state.get().data).toBeUndefined();
        expect(appStore.webhook.state.get().pending).toBe(false);
        view.rerender(
            <MemoryRouter>
                <EditWebhookActor id={2} />
            </MemoryRouter>,
        );
        await waitFor(() =>
            expect(appStore.webhook.state.get().data?.id).toBe(2),
        );
    });

    it.each(['cancel', 'save'])(
        'returns to the filtered list from navigation state after %s',
        async (action) => {
            render(
                <StrictMode>
                    <MemoryRouter
                        initialEntries={['/webhooks?page=1&search=Telegram']}
                    >
                        <App />
                        <Location />
                    </MemoryRouter>
                </StrictMode>,
            );
            const editLink = await screen.findByRole('link', {
                name:
                    action === 'cancel'
                        ? 'Повідомлення Telegram'
                        : 'Редагувати: Повідомлення Telegram',
            });
            fireEvent.click(editLink);
            await screen.findByRole('textbox', { name: /^Назва/ });
            expect(screen.getByLabelText('location').textContent).toBe(
                '/webhooks/6/edit',
            );
            if (action === 'cancel') {
                fireEvent.click(
                    screen.getByRole('link', { name: 'Скасувати' }),
                );
            } else {
                fireEvent.click(
                    screen.getByRole('button', { name: 'Зберегти зміни' }),
                );
            }
            await waitFor(() =>
                expect(screen.getByLabelText('location').textContent).toBe(
                    '/webhooks?page=1&search=Telegram',
                ),
            );
            expect(
                await screen.findByRole('searchbox', {
                    name: 'Пошук за назвою',
                }),
            ).toHaveProperty('value', 'Telegram');
            await screen.findByRole('link', { name: 'Повідомлення Telegram' });
        },
    );

    it.each(['cancel', 'save'])(
        'falls back to the list when the editor is opened directly and %s is used',
        async (action) => {
            render(
                <MemoryRouter initialEntries={['/webhooks/11/edit']}>
                    <App />
                    <Location />
                </MemoryRouter>,
            );
            await screen.findByRole('textbox', { name: /^Назва/ });
            if (action === 'cancel') {
                fireEvent.click(
                    screen.getByRole('link', { name: 'Скасувати' }),
                );
            } else {
                fireEvent.click(
                    screen.getByRole('button', { name: 'Зберегти зміни' }),
                );
            }
            await waitFor(() =>
                expect(screen.getByLabelText('location').textContent).toBe(
                    '/webhooks',
                ),
            );
        },
    );

    it.each(['page', 'search', 'editor'])(
        'shows the saved result from the store until changing %s',
        async (action) => {
            render(
                <StrictMode>
                    <MemoryRouter
                        initialEntries={[
                            {
                                pathname: '/webhooks/11/edit',
                                state: { returnTo: '/webhooks?page=2' },
                            },
                        ]}
                    >
                        <App />
                        <Location />
                    </MemoryRouter>
                </StrictMode>,
            );
            await screen.findByRole('textbox', { name: /^Назва/ });
            fireEvent.click(
                screen.getByRole('button', { name: 'Зберегти зміни' }),
            );
            await screen.findByText('Зміни збережено.');
            expect(appStore.notificationState.get()).toBe(
                NotificationType.WebhookSaved,
            );
            expect(appStore.webhook.saveState.get()).toEqual({
                id: null,
                status: SaveStatus.Idle,
            });
            expect(appStore.webhook.state.get()).toEqual(EMPTY_RESOURCE);
            expect(screen.getByLabelText('location').textContent).toBe(
                '/webhooks?page=2',
            );
            await screen.findByRole('link', {
                name: 'Новий відгук',
            });
            if (action === 'page') {
                fireEvent.click(
                    screen.getByRole('button', { name: 'Сторінка 1 з 3' }),
                );
            } else if (action === 'search') {
                fireEvent.change(
                    screen.getByRole('searchbox', { name: 'Пошук за назвою' }),
                    { target: { value: 'Telegram' } },
                );
            } else {
                fireEvent.click(
                    screen.getByRole('link', {
                        name: 'Новий відгук',
                    }),
                );
                await screen.findByRole('textbox', { name: /^Назва/ });
                fireEvent.click(
                    screen.getByRole('link', { name: /До списку вебхуків/ }),
                );
            }
            await waitFor(() =>
                expect(screen.queryByText('Зміни збережено.')).toBeNull(),
            );
            expect(appStore.webhook.saveState.get().status).toBe(
                SaveStatus.Idle,
            );
            expect(appStore.notificationState.get()).toBeNull();
        },
    );

    it('reacts to logout and cancels a pending item request', async () => {
        const result = deferred<Webhook>();
        vi.mocked(getWebhook).mockReturnValue(result.promise);
        render(
            <MemoryRouter>
                <EditWebhookActor id={1} />
            </MemoryRouter>,
        );
        const signal = vi.mocked(getWebhook).mock.calls[0]?.[1];
        act(() => {
            appStore.session.state.set({
                user,
                reason: null,
                logoutPending: true,
            });
        });
        expect(signal?.aborted).toBe(true);
        await act(async () => {
            result.resolve(mock.webhooks[0]!);
            await result.promise;
        });
        expect(appStore.webhook.state.get().data).toBeUndefined();
    });

    it('cancels the previous item when id changes', async () => {
        const result = deferred<Webhook>();
        vi.mocked(getWebhook)
            .mockReturnValueOnce(result.promise)
            .mockResolvedValueOnce(mock.webhooks[1]!);
        const view = render(
            <MemoryRouter>
                <EditWebhookActor id={1} />
            </MemoryRouter>,
        );
        const signal = vi.mocked(getWebhook).mock.calls[0]?.[1];
        view.rerender(
            <MemoryRouter>
                <EditWebhookActor id={2} />
            </MemoryRouter>,
        );
        await waitFor(() =>
            expect(appStore.webhook.state.get().data?.id).toBe(2),
        );
        expect(signal?.aborted).toBe(true);
        await act(async () => {
            result.resolve(mock.webhooks[0]!);
            await result.promise;
        });
        expect(appStore.webhook.state.get().data?.id).toBe(2);
    });

    it('publishes API validation errors, retries PUT, and returns to the list', async () => {
        render(
            <StrictMode>
                <MemoryRouter
                    initialEntries={[
                        {
                            pathname: '/webhooks/11/edit',
                            state: { returnTo: '/webhooks?page=2' },
                        },
                    ]}
                >
                    <EditWebhookActor id={11} />
                    <Location />
                </MemoryRouter>
            </StrictMode>,
        );
        await waitFor(() =>
            expect(appStore.webhook.state.get().data?.id).toBe(11),
        );
        act(() => saveWebhook({ name: '', url: 'invalid' }));
        await waitFor(() =>
            expect(appStore.webhook.saveState.get()).toMatchObject({
                status: SaveStatus.Error,
                error: { status: HttpStatus.UnprocessableEntity },
            }),
        );
        expect(appStore.webhook.saveState.get()).toMatchObject({
            error: {
                fields: {
                    name: expect.any(Array),
                    url: expect.any(Array),
                },
            },
        });
        act(() =>
            changeWebhook({
                name: 'Updated',
                url: 'https://example.org/new',
            }),
        );
        expect(appStore.webhook.saveState.get()).toEqual({
            id: 11,
            status: SaveStatus.Idle,
        });
        act(() => {
            saveWebhook({ name: 'Updated', url: 'https://example.org/new' });
        });
        await waitFor(() =>
            expect(screen.getByLabelText('location').textContent).toBe(
                '/webhooks?page=2',
            ),
        );
        expect(mock.webhooks[10]?.name).toBe('Updated');
        expect(appStore.webhook.state.get().data).toMatchObject({
            id: 11,
            name: 'Updated',
            url: 'https://example.org/new',
        });
        expect(appStore.webhook.saveState.get().status).toBe(
            SaveStatus.Success,
        );
        expect(appStore.webhooks.state.get().key).toBeNull();
    });

    it('deduplicates saves and ignores a late response after unmount', async () => {
        const result = deferred<Webhook>();
        vi.mocked(updateWebhook).mockReturnValue(result.promise);
        const view = render(
            <MemoryRouter>
                <EditWebhookActor id={1} />
                <Location />
            </MemoryRouter>,
        );
        await waitFor(() =>
            expect(appStore.webhook.state.get().data?.id).toBe(1),
        );
        act(() => {
            saveWebhook({ name: 'New', url: 'https://example.org' });
            saveWebhook({ name: 'Duplicate', url: 'https://example.org' });
        });
        expect(updateWebhook).toHaveBeenCalledTimes(1);
        act(() =>
            changeWebhook({
                name: 'Still pending',
                url: 'https://example.org',
            }),
        );
        expect(appStore.webhook.saveState.get()).toEqual({
            id: 1,
            status: SaveStatus.Pending,
        });
        const signal = vi.mocked(updateWebhook).mock.calls[0]?.[2];
        view.unmount();
        expect(signal?.aborted).toBe(true);
        expect(appStore.webhook.saveState.get()).toEqual({
            id: null,
            status: SaveStatus.Idle,
        });
        await act(async () => {
            result.resolve({ ...mock.webhooks[0]!, name: 'Late' });
            await result.promise;
        });
        expect(appStore.webhook.state.get().data?.name).not.toBe('Late');
        saveWebhook({ name: 'Closed', url: 'https://example.org' });
        expect(updateWebhook).toHaveBeenCalledTimes(1);
    });
});
