import type { RequestError, Webhook } from '@/api';
import { createState, createEvent } from './state';
import { EMPTY_RESOURCE, type Resource } from './resource';

export enum SaveStatus {
    Idle = 'idle',
    Pending = 'pending',
    Success = 'success',
    Error = 'error',
}

type SaveState =
    | { status: SaveStatus.Idle; id: number | null }
    | { status: SaveStatus.Pending; id: number }
    | { status: SaveStatus.Success; id: number }
    | { status: SaveStatus.Error; id: number; error: RequestError };

export function createWebhookStore() {
    const state = createState<Resource<Webhook>>(EMPTY_RESOURCE);
    const saveState = createState<SaveState>({
        id: null,
        status: SaveStatus.Idle,
    });
    const refreshState = createState(0);
    const saveEvent = createEvent();

    return {
        state,
        saveState,
        refreshState,
        save: saveEvent.emit,
        useOnSave: saveEvent.useOnEvent,
        refresh() {
            refreshState.set(refreshState.get() + 1);
        },
        clear() {
            state.set(EMPTY_RESOURCE);
            refreshState.set(0);
            saveState.set({ id: null, status: SaveStatus.Idle });
        },
    };
}
