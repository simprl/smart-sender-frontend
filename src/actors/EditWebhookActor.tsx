import { memo, useEffect, useEffectEvent, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    getWebhook,
    updateWebhook,
    toRequestError,
    type User,
    type Webhook,
} from '@/api';
import {
    appStore,
    EMPTY_RESOURCE,
    NotificationType,
    SaveStatus,
} from '@/store';
import { readReturnTo } from '@/routing';

export const EditWebhookActor = memo(function EditWebhookActor({
    id,
}: {
    id: number | null;
}) {
    const { state } = useLocation();
    const returnTo = readReturnTo(state);
    const { state: sessionState } = appStore.session;
    const { notificationState } = appStore;
    const {
        state: webhookState,
        refreshState,
        saveState,
        useOnSave,
        clear,
    } = appStore.webhook;
    const { user, logoutPending } = sessionState.useValue();
    const resource = webhookState.useValue();
    const currentResource = useRef(resource);
    const saveStatus = saveState.useValue();
    const currentSave = useRef(saveStatus);
    const navigate = useNavigate();
    const loadRequest = useRef<AbortController | null>(null);
    const saveRequest = useRef<AbortController | null>(null);
    const refreshVersion = refreshState.useValue();
    const key = String(id);

    saveState.useOnChange((next) => {
        currentSave.current = next;
    });
    webhookState.useOnChange((next) => {
        const previous = currentResource.current.data;
        currentResource.current = next;
        const { data } = next;
        if (
            data &&
            previous &&
            data.id === previous.id &&
            (data.name !== previous.name || data.url !== previous.url)
        ) {
            const current = currentSave.current;
            if (current.status === SaveStatus.Error && current.id === data.id) {
                saveState.set({ id: data.id, status: SaveStatus.Idle });
            }
        }
    });

    const canPublish = useEffectEvent(
        (owner: User, requestedId: number) =>
            user === owner && !logoutPending && id === requestedId,
    );
    const loadWebhook = useEffectEvent(
        async (
            controller: AbortController,
            owner: User,
            requestedId: number,
        ) => {
            const requestedKey = key;
            const current = currentResource.current;
            const data = current.key === key ? current.data : undefined;
            webhookState.set({ key: requestedKey, data, pending: true });
            try {
                const result = await getWebhook(requestedId, controller.signal);
                if (
                    !controller.signal.aborted &&
                    canPublish(owner, requestedId)
                ) {
                    webhookState.set({
                        key: requestedKey,
                        data: result,
                        pending: false,
                    });
                }
            } catch (cause) {
                if (
                    !controller.signal.aborted &&
                    canPublish(owner, requestedId)
                ) {
                    webhookState.set({
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
            webhookState.set({ ...current, pending: false });
        }
    });
    const handleSaveSuccess = useEffectEvent((webhook: Webhook) => {
        loadRequest.current?.abort();
        webhookState.set({
            key: String(webhook.id),
            data: webhook,
            pending: false,
        });
        saveState.set({ id: webhook.id, status: SaveStatus.Success });
        notificationState.set(NotificationType.WebhookSaved);
        void navigate(returnTo);
    });
    useOnSave(async () => {
        const { key: requestedKey, data, pending } = currentResource.current;
        if (
            !user ||
            logoutPending ||
            id === null ||
            !data ||
            pending ||
            requestedKey !== String(id) ||
            data.id !== id ||
            saveRequest.current
        ) {
            return;
        }
        const requestedId = id;
        const input = { name: data.name, url: data.url };
        const owner = user;
        const controller = new AbortController();
        saveRequest.current = controller;
        saveState.set({ id: requestedId, status: SaveStatus.Pending });
        try {
            const result = await updateWebhook(
                requestedId,
                input,
                controller.signal,
            );
            if (!controller.signal.aborted && canPublish(owner, requestedId)) {
                saveRequest.current = null;
                handleSaveSuccess(result);
            }
        } catch (cause) {
            if (!controller.signal.aborted && canPublish(owner, requestedId)) {
                saveState.set({
                    id: requestedId,
                    status: SaveStatus.Error,
                    error: toRequestError(cause),
                });
            }
        } finally {
            if (saveRequest.current === controller) {
                saveRequest.current = null;
            }
        }
    });

    useEffect(() => {
        if (id === null || !user || logoutPending) {
            return;
        }
        const controller = new AbortController();
        loadRequest.current = controller;
        void loadWebhook(controller, user, id);
        return () => {
            controller.abort();
            if (loadRequest.current === controller) {
                loadRequest.current = null;
            }
            finishLoading();
        };
    }, [id, user, logoutPending, refreshVersion]);

    useEffect(() => {
        if (!user || logoutPending) {
            return;
        }
        saveState.set({ id, status: SaveStatus.Idle });
        notificationState.set(null);
        return () => {
            saveRequest.current?.abort();
            saveRequest.current = null;
            currentResource.current = EMPTY_RESOURCE;
            currentSave.current = { id: null, status: SaveStatus.Idle };
            clear();
        };
    }, [id, user, logoutPending, saveState, notificationState, clear]);

    return null;
});
