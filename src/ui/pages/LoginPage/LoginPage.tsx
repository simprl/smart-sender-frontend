import { AuthLayout, LoginPanel, WelcomePanel } from './components';

export function LoginPage() {
    return (
        <AuthLayout welcome={<WelcomePanel />}>
            <LoginPanel />
        </AuthLayout>
    );
}
