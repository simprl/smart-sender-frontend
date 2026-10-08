import type { ListParams } from '@/api';

export interface NavigationState {
    returnTo?: string;
}

export function readListParams(search: string): ListParams {
    const params = new URLSearchParams(search);
    const page = Number(params.get('page') ?? '1');
    return {
        page: Number.isSafeInteger(page) && page > 0 ? page : 1,
        search: params.get('search') ?? '',
    };
}

export function readWebhookId(value?: string): number | null {
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function readReturnTo(state: unknown): string {
    if (
        state !== null &&
        typeof state === 'object' &&
        'returnTo' in state &&
        typeof state.returnTo === 'string' &&
        state.returnTo.length > 0
    ) {
        return state.returnTo;
    }
    return '/webhooks';
}
