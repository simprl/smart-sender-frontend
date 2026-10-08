import { DEMO_EMAIL, DEMO_PASSWORD } from '@/demo';
import { appStore } from '@/store';
import { text } from '@/i18n';
import { Button, Icon, ButtonVariant, IconName } from '@ui/components';

export function DemoCredentials() {
    const { state: loginState } = appStore.login;
    const loginStatus = loginState.useValue();
    const { pending } = loginStatus;
    return (
        <div className="mt-7 rounded-lg border border-border bg-subtle px-5 py-[18px] text-sm">
            <p className="mt-[7px] mb-3 leading-[1.7] text-muted">
                {text.demoHint}
            </p>
            <dl className="mb-4 grid gap-2">
                <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
                    <dt className="text-muted">{text.email}</dt>
                    <dd>
                        <code className="text-sm wrap-anywhere select-all">
                            {DEMO_EMAIL}
                        </code>
                    </dd>
                </div>
                <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
                    <dt className="text-muted">{text.password}</dt>
                    <dd>
                        <code className="text-sm wrap-anywhere select-all">
                            {DEMO_PASSWORD}
                        </code>
                    </dd>
                </div>
            </dl>
            <Button
                variant={ButtonVariant.Text}
                disabled={pending}
                onClick={() =>
                    loginState.set({
                        ...loginStatus,
                        email: DEMO_EMAIL,
                        password: DEMO_PASSWORD,
                    })
                }
            >
                {text.useDemo}
                <Icon name={IconName.Arrow} size={16} />
            </Button>
        </div>
    );
}
