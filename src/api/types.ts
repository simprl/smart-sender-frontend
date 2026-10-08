export interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    name: string;
}

export interface Webhook {
    id: number;
    name: string;
    url: string;
    active: boolean;
    created_at: string;
}

export interface WebhookList {
    data: Webhook[];
    paging: {
        pages: { current: number; last: number };
        results: { total: number; limitation: number };
    };
}

export interface ListParams {
    page: number;
    search: string;
}
export interface WebhookInput {
    name: string;
    url: string;
}
export interface Credentials {
    email: string;
    password: string;
}

export enum ErrorType {
    BadRequest = 'BadRequestException',
    Authentication = 'AuthenticationException',
    NotFound = 'NotFoundException',
    TokenMismatch = 'TokenMismatchException',
    Validation = 'ValidationException',
}

export enum RequestErrorStatus {
    NetworkError = 'NETWORK_ERROR',
}

export interface ErrorEnvelope {
    error: {
        type: ErrorType;
        message: string;
        payload?: Record<string, string[]>;
    };
}

export interface RequestError {
    status: number | RequestErrorStatus;
    message: string;
    fields?: Record<string, string[]>;
}
