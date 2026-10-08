import { type RequestError, RequestErrorStatus } from './types';

export class ApiFailure extends Error {
    readonly detail: RequestError;
    constructor(detail: RequestError) {
        super(detail.message);
        this.name = 'ApiFailure';
        this.detail = detail;
    }
}

export function parseError(status: number, body: unknown): RequestError {
    const error =
        isRecord(body) && isRecord(body.error) ? body.error : undefined;
    const fields: Record<string, string[]> = {};
    if (error && isRecord(error.payload)) {
        for (const [key, value] of Object.entries(error.payload)) {
            if (
                Array.isArray(value) &&
                value.every((item): item is string => typeof item === 'string')
            ) {
                fields[key] = value;
            }
        }
    }
    return {
        status,
        message:
            typeof error?.message === 'string'
                ? error.message
                : `HTTP ${status}`,
        fields: Object.keys(fields).length ? fields : undefined,
    };
}

export function toRequestError(error: unknown): RequestError {
    if (error instanceof ApiFailure) {
        return error.detail;
    }
    return {
        status: RequestErrorStatus.NetworkError,
        message: 'Network request failed',
    };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}
