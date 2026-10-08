import { createSessionStore, type Session } from './session';
import { createLoginStore } from './login';
import { createWebhooksStore } from './webhooks';
import { createWebhookStore } from './webhook';
import { createState } from './state';
import type { NotificationType } from './notifications';

export function createAppStore() {
    const session = createSessionStore();
    const login = createLoginStore();
    const webhooks = createWebhooksStore();
    const webhook = createWebhookStore();
    const notificationState = createState<NotificationType | null>(null);

    return {
        session,
        login,
        webhooks,
        webhook,
        notificationState,
        clearSession(reason: Session['reason'] = null) {
            notificationState.set(null);
            login.reset();
            session.state.set({ user: null, reason, logoutPending: false });
        },
    };
}
