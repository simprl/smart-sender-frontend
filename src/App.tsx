import {
    Link,
    Navigate,
    Route,
    Routes,
    useLocation,
    useParams,
} from 'react-router-dom';
import {
    LoginActor,
    SessionActor,
    WebhooksActor,
    EditWebhookActor,
} from '@/actors';
import { appStore } from '@/store';
import { readListParams, readWebhookId } from '@/routing';
import { text } from '@/i18n';
import { EmptyState, Layout } from '@ui/components';
import { LoginPage, WebhooksPage, EditWebhookPage } from '@ui/pages';

export function App() {
    const { state: sessionState } = appStore.session;
    const { user } = sessionState.useValue();
    // Login keeps the requested URL, including list page and search parameters.
    if (!user) {
        return <LoginRoute />;
    }
    return (
        <Routes>
            <Route element={<ProtectedLayout />}>
                <Route path="/" element={<Navigate to="/webhooks" replace />} />
                <Route path="/webhooks" element={<WebhooksRoute />} />
                <Route
                    path="/webhooks/:id/edit"
                    element={<EditWebhookRoute />}
                />
                <Route
                    path="*"
                    element={
                        <EmptyState title={text.missingPage}>
                            <Link to="/webhooks">{text.back}</Link>
                        </EmptyState>
                    }
                />
            </Route>
        </Routes>
    );
}

function LoginRoute() {
    return (
        <>
            <LoginActor />
            <LoginPage />
        </>
    );
}

function ProtectedLayout() {
    return (
        <>
            <SessionActor />
            <Layout />
        </>
    );
}

function WebhooksRoute() {
    const location = useLocation();
    const params = readListParams(location.search);
    return (
        <>
            <WebhooksActor {...params} query={location.search} />
            <WebhooksPage {...params} />
        </>
    );
}

function EditWebhookRoute() {
    const { id: rawId } = useParams();
    const id = readWebhookId(rawId);
    return (
        <>
            <EditWebhookActor id={id} />
            <EditWebhookPage id={id} />
        </>
    );
}
