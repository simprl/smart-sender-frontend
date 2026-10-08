import { memo, useEffect, useEffectEvent, useRef } from 'react';
import { apiClient, logout, type User } from '@/api';
import { appStore, SessionEndReason } from '@/store';

export const SessionActor = memo(function SessionActor() {
    const { notificationState, clearSession } = appStore;
    const { state: sessionState, useOnLogout } = appStore.session;
    const { user, logoutPending } = sessionState.useValue();
    const logoutRequest = useRef<AbortController | null>(null);

    useOnLogout(async () => {
        if (!user || logoutPending || logoutRequest.current) {
            return;
        }
        const controller = new AbortController();
        logoutRequest.current = controller;
        sessionState.set({ user, reason: null, logoutPending: true });
        notificationState.set(null);
        let reason: SessionEndReason | null = null;
        try {
            await logout(controller.signal);
        } catch {
            reason = SessionEndReason.LogoutFailed;
        }
        if (!controller.signal.aborted) {
            logoutRequest.current = null;
            clearSession(reason);
        }
    });

    const cancelLogout = useEffectEvent((owner: User | null) => {
        if (logoutRequest.current) {
            logoutRequest.current.abort();
            logoutRequest.current = null;
            if (user === owner) {
                clearSession();
            }
        }
    });

    useEffect(() => {
        if (!user) {
            return;
        }
        let isActive = true;
        apiClient.setOnSessionExpired(() => {
            if (isActive) {
                logoutRequest.current?.abort();
                logoutRequest.current = null;
                clearSession(SessionEndReason.Expired);
            }
        });
        return () => {
            isActive = false;
            apiClient.setOnSessionExpired(undefined);
        };
    }, [user, clearSession]);
    useEffect(() => () => cancelLogout(user), [user]);
    return null;
});
