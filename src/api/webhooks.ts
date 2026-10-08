import { HttpMethod } from './http';
import { apiClient } from './runtime';
import type { ListParams, Webhook, WebhookInput, WebhookList } from './types';

export const WEBHOOKS_PAGE_SIZE = 10;

export function getWebhooks(
    { page, search }: ListParams,
    signal?: AbortSignal,
) {
    const params = new URLSearchParams({
        page: String(page),
        limit: String(WEBHOOKS_PAGE_SIZE),
        search,
    });
    return apiClient.request<WebhookList>(`/v1/webhooks?${params}`, {
        protected: true,
        signal,
    });
}

export function getWebhook(id: number, signal?: AbortSignal) {
    return apiClient.request<Webhook>(`/v1/webhooks/${id}`, {
        protected: true,
        signal,
    });
}

export function updateWebhook(
    id: number,
    input: WebhookInput,
    signal?: AbortSignal,
) {
    return apiClient.request<Webhook>(`/v1/webhooks/${id}`, {
        method: HttpMethod.Put,
        body: input,
        protected: true,
        signal,
    });
}
