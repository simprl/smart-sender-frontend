import type { RequestError, Webhook } from '@/api';
import { appStore } from '@/store';
import { text } from '@/i18n';
import {
    Button,
    EmptyState,
    ErrorNotice,
    Icon,
    Loading,
    ButtonVariant,
    IconName,
} from '@ui/components';
import { Pagination } from './Pagination';
import { SearchInput } from './SearchInput';
import { WebhooksTable } from './WebhooksTable';

interface Props {
    webhooks?: Webhook[];
    total: number;
    pageSize: number;
    last: number;
    page: number;
    search: string;
    pending: boolean;
    error?: RequestError;
    onPageChange: (page: number) => void;
    onRefresh: () => void;
}

export function WebhooksList({
    webhooks,
    total,
    pageSize,
    last,
    page,
    search,
    pending,
    error,
    onPageChange,
    onRefresh,
}: Props) {
    const { searchState } = appStore.webhooks;
    const first = webhooks?.length ? (page - 1) * pageSize + 1 : 0;
    const lastVisible = webhooks?.length
        ? (page - 1) * pageSize + webhooks.length
        : 0;
    return (
        <section
            className="overflow-hidden rounded-lg border border-border bg-white shadow-card"
            aria-label={text.webhooks}
            aria-busy={pending}
        >
            <div className="flex items-center justify-between gap-5 px-6 py-5 max-phone:gap-3 max-phone:p-4">
                <SearchInput />
                <div className="flex items-center gap-5">
                    <span className="text-sm whitespace-nowrap text-muted max-desktop:hidden">
                        {webhooks ? text.total(total) : '—'}
                    </span>
                    <Button
                        variant={ButtonVariant.Secondary}
                        className="max-phone:gap-0 max-phone:p-3 max-phone:text-[0px]"
                        onClick={onRefresh}
                        disabled={pending}
                    >
                        <Icon name={IconName.Refresh} size={16} />
                        {pending && webhooks ? text.updating : text.refresh}
                    </Button>
                </div>
            </div>
            <ErrorNotice error={error} onRetry={onRefresh} flush />
            {!webhooks && pending && <Loading label={text.loading} />}
            {webhooks && webhooks.length > 0 && (
                <WebhooksTable webhooks={webhooks} />
            )}
            {webhooks && webhooks.length === 0 && !error && (
                <EmptyState
                    title={text.emptyTitle}
                    description={
                        search ? text.emptyDescription : text.noWebhooks
                    }
                    icon={<Icon name={IconName.Search} size={27} />}
                >
                    {search && (
                        <Button
                            variant={ButtonVariant.Secondary}
                            onClick={() => searchState.set('')}
                        >
                            {text.clearSearch}
                        </Button>
                    )}
                    {page > last && (
                        <Button
                            variant={ButtonVariant.Secondary}
                            onClick={() => onPageChange(1)}
                        >
                            {text.page(1, last)}
                        </Button>
                    )}
                </EmptyState>
            )}
            {webhooks && (
                <div className="flex items-center justify-between border-t border-border px-6 py-4 text-sm text-muted max-phone:px-4">
                    <span>{text.range(first, lastVisible, total)}</span>
                    <Pagination
                        page={page}
                        last={last}
                        onPageChange={onPageChange}
                    />
                </div>
            )}
        </section>
    );
}
