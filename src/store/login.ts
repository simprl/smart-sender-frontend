import type { Credentials, RequestError } from '@/api';
import { createState, createEvent } from './state';

interface LoginState extends Credentials {
    pending: boolean;
    error?: RequestError;
}

export function createLoginStore() {
    const initialState: LoginState = {
        email: '',
        password: '',
        pending: false,
    };
    const state = createState<LoginState>(initialState);
    const loginEvent = createEvent();

    return {
        state,
        login: loginEvent.emit,
        useOnLogin: loginEvent.useOnEvent,
        reset() {
            state.set(initialState);
        },
    };
}
