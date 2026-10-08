import type { User } from '@/api';
import { createState, createEvent } from './state';

export enum SessionEndReason {
    Expired = 'expired',
    LogoutFailed = 'logout-failed',
}

export interface Session {
    user: User | null;
    reason: SessionEndReason | null;
    logoutPending: boolean;
}

export function createSessionStore() {
    const state = createState<Session>({
        user: null,
        reason: null,
        logoutPending: false,
    });
    const logoutEvent = createEvent();
    return {
        state,
        logout: logoutEvent.emit,
        useOnLogout: logoutEvent.useOnEvent,
    };
}
