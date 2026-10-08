// @vitest-environment jsdom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { type ListParams, HttpStatus } from '@/api';
import { createAppStore, NotificationType, SaveStatus } from '@/store';

afterEach(cleanup);

describe('application store groups', () => {
    it('keeps login errors when fields change without a mounted actor', () => {
        const store = createAppStore();
        const error = {
            status: HttpStatus.UnprocessableEntity,
            message: 'Invalid credentials',
        };
        store.login.state.set({
            email: '',
            password: '',
            pending: false,
            error,
        });
        store.login.state.set({
            ...store.login.state.get(),
            email: 'reviewer@example.com',
        });
        expect(store.login.state.get().email).toBe('reviewer@example.com');
        expect(store.login.state.get().error).toBe(error);
    });

    it('keeps save errors when webhook fields change without a mounted actor', () => {
        const store = createAppStore();
        const error = {
            status: HttpStatus.UnprocessableEntity,
            message: 'Invalid webhook',
        };
        store.webhook.state.set({
            key: '1',
            pending: false,
            data: {
                id: 1,
                name: 'Before',
                url: 'https://example.com',
                active: true,
                created_at: '',
            },
        });
        store.webhook.saveState.set({ id: 1, status: SaveStatus.Error, error });
        store.webhook.state.set({
            ...store.webhook.state.get(),
            data: { ...store.webhook.state.get().data!, name: 'After' },
        });
        expect(store.webhook.state.get().data?.name).toBe('After');
        expect(store.webhook.saveState.get()).toEqual({
            id: 1,
            status: SaveStatus.Error,
            error,
        });
    });

    it('increments refresh counters directly and independently without an actor', () => {
        const store = createAppStore();
        store.webhooks.refresh();
        store.webhooks.refresh();
        store.webhook.refresh();
        expect(store.webhooks.refreshState.get()).toBe(2);
        expect(store.webhook.refreshState.get()).toBe(1);
        expect(store.webhooks.state.get().pending).toBe(false);
        expect(store.webhook.state.get().pending).toBe(false);
    });

    it('delivers search and pagination through one params subscription', () => {
        const store = createAppStore();
        const received: Partial<ListParams>[] = [];
        const view = renderHook(() =>
            store.webhooks.useOnParamsChange((params) => received.push(params)),
        );
        store.webhooks.changeParams({ page: 1, search: 'Telegram' });
        store.webhooks.changeParams({ page: 2 });
        expect(received).toEqual([
            { page: 1, search: 'Telegram' },
            { page: 2 },
        ]);
        view.unmount();
        store.webhooks.changeParams({ search: 'after unmount' });
        expect(received).toHaveLength(2);
    });

    it('preserves notifications when page stores are cleared', () => {
        const store = createAppStore();
        store.notificationState.set(NotificationType.WebhookSaved);
        store.webhooks.clear();
        store.webhook.clear();
        expect(store.notificationState.get()).toBe(
            NotificationType.WebhookSaved,
        );
    });

    it('clears notifications and login fields when the session ends', () => {
        const store = createAppStore();
        store.notificationState.set(NotificationType.WebhookSaved);
        store.login.state.set({
            email: 'reviewer@example.com',
            password: 'secret',
            pending: false,
        });
        store.login.state.set({ ...store.login.state.get(), pending: true });
        store.clearSession();
        expect(store.notificationState.get()).toBeNull();
        expect(store.login.state.get()).toEqual({
            email: '',
            password: '',
            pending: false,
        });
    });
});
