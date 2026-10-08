import type { ListParams, WebhookList } from '@/api';
import { createState, createEvent } from './state';
import { EMPTY_RESOURCE, type Resource } from './resource';

export function createWebhooksStore() {
    const state = createState<Resource<WebhookList>>(EMPTY_RESOURCE);
    const refreshState = createState(0);
    const searchState = createState('');
    const paramsChangeEvent = createEvent<Partial<ListParams>>();
    return {
        state,
        refreshState,
        searchState,
        changeParams: paramsChangeEvent.emit,
        useOnParamsChange: paramsChangeEvent.useOnEvent,
        refresh() {
            refreshState.set(refreshState.get() + 1);
        },
        clear() {
            state.set(EMPTY_RESOURCE);
            refreshState.set(0);
            searchState.set('');
        },
    };
}

export function listKey({ page, search }: ListParams) {
    return JSON.stringify([page, search]);
}
