import type { RequestError } from '@/api';

export interface Resource<T> {
    key: string | null;
    data?: T;
    pending: boolean;
    error?: RequestError;
}

export const EMPTY_RESOURCE = { key: null, pending: false };
