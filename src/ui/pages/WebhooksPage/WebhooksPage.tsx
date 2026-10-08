import { useCallback } from 'react';
import { appStore, listKey } from '@/store';
import { text } from '@/i18n';
import { PageHeading } from '@ui/components';
import { SavedNotice, WebhooksList } from './components';

export function WebhooksPage({
    page,
    search,
}: {
    page: number;
    search: string;
}) {
    const { state: webhooksState, changeParams, refresh } = appStore.webhooks;
    const changePage = useCallback(
        (value: number) => changeParams({ page: value }),
        [changeParams],
    );
    const resource = webhooksState.useValue();
    const isCurrent = resource.key === listKey({ page, search });
    const data = isCurrent ? resource.data : undefined;
    return (
        <>
            <PageHeading
                eyebrow={text.integrations}
                title={text.webhooks}
                description={text.listDescription}
            />
            <SavedNotice />
            <WebhooksList
                webhooks={data?.data}
                total={data?.paging.results.total ?? 0}
                pageSize={data?.paging.results.limitation ?? 0}
                last={data?.paging.pages.last ?? 1}
                page={page}
                search={search}
                pending={!isCurrent || resource.pending}
                error={isCurrent ? resource.error : undefined}
                onPageChange={changePage}
                onRefresh={refresh}
            />
        </>
    );
}
