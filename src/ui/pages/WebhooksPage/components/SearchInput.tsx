import { appStore } from '@/store';
import { text } from '@/i18n';
import { Icon, IconName } from '@ui/components';

export function SearchInput() {
    const { searchState } = appStore.webhooks;
    const value = searchState.useValue();
    return (
        <div className="flex min-h-[44px] w-80 items-center gap-2.5 rounded-lg border border-input-border px-3 text-muted focus-within:border-brand focus-within:shadow-[0_0_0_3px_#1380f61a] max-phone:w-full">
            <Icon name={IconName.Search} size={19} />
            <input
                className="w-full flex-1 border-0 bg-transparent py-[11px] text-base text-ink outline-none placeholder:text-placeholder"
                type="search"
                aria-label={text.search}
                placeholder={text.searchPlaceholder}
                value={value}
                onChange={(event) => searchState.set(event.target.value)}
            />
        </div>
    );
}
