import { appStore } from '@/store';
import { text } from '@/i18n';
import { Button, ErrorNotice, Icon, TextField, IconName } from '@ui/components';

export function LoginForm() {
    const { state: loginState, login } = appStore.login;
    const loginStatus = loginState.useValue();
    const { email, password, pending, error } = loginStatus;
    return (
        <form
            className="relative mt-6"
            onSubmit={(event) => {
                event.preventDefault();
                login();
            }}
            noValidate
        >
            <div className="absolute inset-x-0 bottom-full pb-1">
                <ErrorNotice error={error} reserveSpace />
            </div>
            <TextField
                id="email"
                label={text.email}
                type="email"
                autoComplete="username"
                value={email}
                disabled={pending}
                onChange={(event) =>
                    loginState.set({
                        ...loginStatus,
                        email: event.target.value,
                    })
                }
                placeholder="you@company.com"
                required
                errors={error?.fields?.email}
            />
            <TextField
                id="password"
                label={text.password}
                type="password"
                autoComplete="current-password"
                value={password}
                disabled={pending}
                onChange={(event) =>
                    loginState.set({
                        ...loginStatus,
                        password: event.target.value,
                    })
                }
                required
                placeholder="Введіть пароль"
                errors={error?.fields?.password}
            />
            <Button type="submit" fullWidth disabled={pending}>
                {pending ? text.loggingIn : text.login}
                <Icon name={IconName.Arrow} size={18} />
            </Button>
        </form>
    );
}
