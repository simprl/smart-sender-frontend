import { text } from '@/i18n';
import { Icon, IconName } from '../common';

export function Topbar({
    name,
    pending,
    onLogout,
}: {
    name?: string;
    pending: boolean;
    onLogout: () => void;
}) {
    return (
        <header className="flex min-h-[76px] items-center justify-between gap-[18px] border-b border-border bg-white px-9 text-sm text-muted max-desktop:px-6 max-tablet:min-h-16 max-tablet:px-5 max-phone:gap-2 max-phone:text-xs">
            <span>
                {text.integrations}
                <span className="mx-3.5 text-[#a0aabb] max-phone:mx-2">/</span>
                <strong className="font-semibold text-ink">
                    {text.webhooks}
                </strong>
            </span>
            <div className="flex items-center gap-3 max-phone:gap-1.5">
                <span className="text-sm text-[#475467] max-phone:hidden">
                    {name}
                </span>
                <span className="grid size-[34px] place-items-center rounded-full bg-brand-soft text-xs font-semibold text-primary max-phone:hidden">
                    ОД
                </span>
                <button
                    className="flex items-center gap-[7px] border-0 bg-transparent py-2.5 pr-1 pl-2.5 text-sm text-muted hover:text-primary"
                    onClick={onLogout}
                    disabled={pending}
                >
                    <Icon name={IconName.Logout} size={18} />
                    {pending ? text.loggingOut : text.logout}
                </button>
            </div>
        </header>
    );
}
