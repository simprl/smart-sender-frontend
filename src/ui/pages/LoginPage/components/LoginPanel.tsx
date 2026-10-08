import { appStore, SessionEndReason } from '@/store';
import { text } from '@/i18n';
import { Notice } from '@ui/components';
import { LoginForm } from './LoginForm';
import { DemoCredentials } from './DemoCredentials';

export function LoginPanel() {
    const { state: sessionState } = appStore.session;
    const { reason } = sessionState.useValue();
    return (
        <div className="w-full max-w-[380px]">
            <span className="mb-2.5 block text-xs font-semibold text-muted">
                {text.workspace}
            </span>
            <h2
                id="login-title"
                className="mb-3 text-3xl font-semibold tracking-[-0.7px]"
            >
                {text.loginTitle}
            </h2>
            <p className="mb-8 text-base leading-[1.7] text-muted">
                {text.loginDescription}
            </p>
            {reason && (
                <Notice>
                    {reason === SessionEndReason.Expired
                        ? text.expired
                        : text.logoutFailed}
                </Notice>
            )}
            <LoginForm />
            <DemoCredentials />
        </div>
    );
}
