import { useEffect, useEffectEvent, useSyncExternalStore } from 'react';

export function createState<T>(initial: T) {
    let value = initial;
    const listeners = new Set<() => void>();
    const changes = createEvent<T>();
    const get = () => value;
    const subscribe = (listener: () => void) => {
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    };
    return {
        get,
        set(next: T) {
            if (Object.is(value, next)) {
                return;
            }
            value = next;
            for (const listener of listeners) {
                listener();
            }
            changes.emit(next);
        },
        useValue: () => useSyncExternalStore(subscribe, get, get),
        useOnChange: changes.useOnEvent,
    };
}

export function createEvent<T = void>() {
    const listeners = new Set<(value: T) => void>();
    const subscribe = (listener: (value: T) => void) => {
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    };
    return {
        emit(value: T) {
            for (const listener of listeners) {
                listener(value);
            }
        },
        useOnEvent: createListenerHook(subscribe),
    };
}

function createListenerHook<T>(
    subscribe: (listener: (value: T) => void) => () => void,
) {
    return function useOnEvent(listener: (value: T) => void) {
        const notify = useEffectEvent(listener);
        useEffect(() => subscribe(notify), []);
    };
}
