// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createState, createEvent } from '@/store/state';

afterEach(cleanup);

describe('store primitives', () => {
    it('keeps a stable snapshot and notifies only on a changed value', () => {
        const initial = { pending: false };
        const state = createState(initial);
        const changed: (typeof initial)[] = [];
        const view = renderHook(() => {
            state.useOnChange((value) => changed.push(value));
            return state.useValue();
        });
        expect(state.get()).toBe(initial);
        expect(view.result.current).toBe(initial);
        act(() => state.set(initial));
        expect(changed).toEqual([]);
        const next = { pending: true };
        act(() => state.set(next));
        expect(state.get()).toBe(next);
        expect(view.result.current).toBe(next);
        expect(changed).toEqual([next]);
        view.unmount();
        state.set(initial);
        expect(changed).toEqual([next]);
    });

    it('delivers events only to active subscribers without retaining their payload', () => {
        const event = createEvent<{ password: string }>();
        const handled: { password: string }[] = [];
        event.emit({ password: 'before subscription' });
        const view = renderHook(() =>
            event.useOnEvent((value) => handled.push(value)),
        );
        expect(handled).toEqual([]);
        event.emit({ password: 'test' });
        expect(handled).toEqual([{ password: 'test' }]);
        view.unmount();
        event.emit({ password: 'after cleanup' });
        expect(handled).toEqual([{ password: 'test' }]);
    });
});
