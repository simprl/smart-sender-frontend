import { HttpStatus } from '@/api';
import { Link, useLocation } from 'react-router-dom';
import { appStore } from '@/store';
import { readReturnTo } from '@/routing';
import { text } from '@/i18n';
import { EmptyState, ErrorNotice, Loading, PageHeading } from '@ui/components';
import { WebhookForm } from './components';

export function EditWebhookPage({ id }: { id: number | null }) {
    const { state } = useLocation();
    const returnTo = readReturnTo(state);
    const { state: webhookState, refresh } = appStore.webhook;
    const resource = webhookState.useValue();
    const isCurrent = id !== null && resource.key === String(id);
    const webhook = isCurrent ? resource.data : undefined;
    const loadError = isCurrent ? resource.error : undefined;
    const isNotFound = id === null || loadError?.status === HttpStatus.NotFound;
    return (
        <>
            <Link
                to={returnTo}
                className="mb-6 inline-block text-sm text-primary hover:underline"
            >
                ← {text.back}
            </Link>
            <PageHeading
                eyebrow={text.integrations}
                title={text.editTitle}
                description={text.editDescription}
            />
            {isNotFound ? (
                <EmptyState
                    title={text.notFoundTitle}
                    description={text.notFoundDescription}
                />
            ) : loadError ? (
                <ErrorNotice error={loadError} onRetry={refresh} />
            ) : !webhook ? (
                <Loading label={text.loadItem} />
            ) : (
                <WebhookForm backLink={returnTo} />
            )}
        </>
    );
}
