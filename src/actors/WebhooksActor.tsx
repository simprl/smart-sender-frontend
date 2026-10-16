import { memo, useEffect, useEffectEvent, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWebhooks, toRequestError, updateWebhook, type User } from '@/api';
import { appStore, listKey, EMPTY_RESOURCE, SaveStatus } from '@/store';

export const WebhooksActor = memo(function WebhooksActor({
    page,
    search,
    query,
}: {
    page: number;
    search: string;
    query: string;
}) {
    const { state: sessionState } = appStore.session;
    const {
        state: webhooksState,
        refreshState,
        searchState,
        changeParams,
        useOnParamsChange,
        clear,
        saveActive,
    } = appStore.webhooks;
    const { notificationState } = appStore;
    const { user, logoutPending } = sessionState.useValue();
    const resource = webhooksState.useValue();
    const currentResource = useRef(resource);
    const navigate = useNavigate();
    const params = useMemo(() => ({ page, search }), [page, search]);
    const key = listKey(params);
    const previousKey = useRef(key);
    const refreshVersion = refreshState.useValue();
    const searchValue = searchState.useValue();

    webhooksState.useOnChange((next) => {
        currentResource.current = next;
    });

    const canPublish = useEffectEvent(
        (owner: User, requestedKey: string) =>
            user === owner && !logoutPending && key === requestedKey,
    );
    const loadWebhooks = useEffectEvent(
        async (controller: AbortController, owner: User) => {
            const current = currentResource.current;
            const data = current.key === key ? current.data : undefined;
            const requestedKey = key;
            webhooksState.set({ key: requestedKey, data, pending: true });
            try {
                const result = await getWebhooks(params, controller.signal);
                if (
                    !controller.signal.aborted &&
                    canPublish(owner, requestedKey)
                ) {
                    webhooksState.set({
                        key: requestedKey,
                        data: result,
                        pending: false,
                    });
                }
            } catch (cause) {
                if (
                    !controller.signal.aborted &&
                    canPublish(owner, requestedKey)
                ) {
                    webhooksState.set({
                        key: requestedKey,
                        data,
                        pending: false,
                        error: toRequestError(cause),
                    });
                }
            }
        },
    );
    const finishLoading = useEffectEvent(() => {
        const current = currentResource.current;
        if (current.pending) {
            webhooksState.set({ ...current, pending: false });
        }
    });
    useEffect(() => {
        if (previousKey.current !== key) {
            previousKey.current = key;
            notificationState.set(null);
        }
    }, [key, notificationState]);

    useEffect(() => {
        if (!user || logoutPending) {
            return;
        }
        const controller = new AbortController();
        void loadWebhooks(controller, user);
        return () => {
            controller.abort();
            finishLoading();
        };
    }, [params, user, logoutPending, refreshVersion]);

    useEffect(() => {
        searchState.set(search);
    }, [search, searchState]);

    useEffect(() => {
        if (!user || logoutPending || searchValue === search) {
            return;
        }
        const timer = setTimeout(
            () => changeParams({ page: 1, search: searchValue }),
            300,
        );
        return () => clearTimeout(timer);
    }, [searchValue, search, user, logoutPending, changeParams]);

    useOnParamsChange(
        ({ page: nextPage = page, search: nextSearch = search }) => {
            if (!Number.isSafeInteger(nextPage) || nextPage < 1) {
                return;
            }
            const next = new URLSearchParams(query);
            next.set('page', String(nextPage));
            if (nextSearch) {
                next.set('search', nextSearch);
            } else {
                next.delete('search');
            }
            void navigate(`/webhooks?${next}`);
        },
    );
    useEffect(
        () => () => {
            currentResource.current = EMPTY_RESOURCE;
            clear();
        },
        [user, logoutPending, clear],
    );

    saveActive.useOnEvent(({id, active}) => {
        console.log({ id, active });
            const result = await updateWebhookActive(
                requestedId,
                input: { id, active },
                controller.signal,
            );
        // const { key: requestedKey, data, pending } = currentResource.current;
        // if (
        //     !user ||
        //     logoutPending ||
        //     id === null ||
        //     !data ||
        //     pending ||
        //     requestedKey !== String(id) ||
        //     data.id !== id ||
        //     saveRequest.current
        // ) {
        //     return;
        // }
        // const requestedId = id;
        // const input = { name: data.name, url: data.url };
        // const owner = user;
        // const controller = new AbortController();
        //
        // try {
        //     const result = await updateWebhook(
        //         requestedId,
        //         input,
        //         controller.signal,
        //     );
        //     if (!controller.signal.aborted && canPublish(owner, requestedId)) {
        //         saveRequest.current = null;
        //         handleSaveSuccess(result);
        //     }
        // } catch (cause) {
        //     if (!controller.signal.aborted && canPublish(owner, requestedId)) {
        //         saveState.set({
        //             id: requestedId,
        //             status: SaveStatus.Error,
        //             error: toRequestError(cause),
        //         });
        //     }
        // } finally {
        //     if (saveRequest.current === controller) {
        //         saveRequest.current = null;
        //     }
        // }
    })

    return null;
});
