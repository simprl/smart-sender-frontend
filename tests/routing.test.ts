import { describe, expect, it } from 'vitest';
import { readReturnTo } from '@/routing';

describe('editor return navigation', () => {
    it('preserves the list page and search from navigation state', () => {
        expect(
            readReturnTo({ returnTo: '/webhooks?page=2&search=Telegram' }),
        ).toBe('/webhooks?page=2&search=Telegram');
    });

    it.each([
        undefined,
        null,
        '/webhooks?page=2',
        {},
        { returnTo: 2 },
        { returnTo: '' },
    ])('falls back to the list for missing or invalid state %j', (state) => {
        expect(readReturnTo(state)).toBe('/webhooks');
    });
});
