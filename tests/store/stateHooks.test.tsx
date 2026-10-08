// @vitest-environment jsdom
import { StrictMode } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createEvent, createState } from '@/store/state';

afterEach(cleanup);

describe('store subscription hooks', () => {
    it('delivers events once with the latest handler and stops on unmount', () => {
        const event = createEvent<string>();
        const received: string[] = [];
        function Listener({ prefix }: { prefix: string }) {
            event.useOnEvent((value) => received.push(`${prefix}: ${value}`));
            return null;
        }

        event.emit('before mount');
        const view = render(
            <StrictMode>
                <Listener prefix="first" />
            </StrictMode>,
        );
        expect(received).toEqual([]);
        event.emit('one');
        view.rerender(
            <StrictMode>
                <Listener prefix="latest" />
            </StrictMode>,
        );
        event.emit('two');
        expect(received).toEqual(['first: one', 'latest: two']);

        view.unmount();
        event.emit('after unmount');
        expect(received).toEqual(['first: one', 'latest: two']);
    });

    it('keeps listener order on rerender and unsubscribes each component independently', () => {
        const event = createEvent<string>();
        const received: string[] = [];
        function Listener({ name }: { name: string }) {
            event.useOnEvent((value) => received.push(`${name}: ${value}`));
            return null;
        }

        const first = render(<Listener name="first" />);
        const second = render(<Listener name="second" />);
        first.rerender(<Listener name="updated" />);
        event.emit('one');
        expect(received).toEqual(['updated: one', 'second: one']);

        first.unmount();
        event.emit('two');
        expect(received).toEqual([
            'updated: one',
            'second: one',
            'second: two',
        ]);
        second.unmount();
    });

    it('passes every changed state value to the latest handler without an initial notification', () => {
        const state = createState(0);
        const received: string[] = [];
        function Listener({ prefix }: { prefix: string }) {
            state.useOnChange((value) => received.push(`${prefix}: ${value}`));
            return null;
        }

        state.set(1);
        const view = render(
            <StrictMode>
                <Listener prefix="first" />
            </StrictMode>,
        );
        expect(received).toEqual([]);
        state.set(1);
        state.set(2);
        state.set(3);
        expect(received).toEqual(['first: 2', 'first: 3']);

        view.rerender(
            <StrictMode>
                <Listener prefix="latest" />
            </StrictMode>,
        );
        state.set(4);
        expect(received).toEqual(['first: 2', 'first: 3', 'latest: 4']);
        view.unmount();
        state.set(5);
        expect(received).toEqual(['first: 2', 'first: 3', 'latest: 4']);
    });
});
