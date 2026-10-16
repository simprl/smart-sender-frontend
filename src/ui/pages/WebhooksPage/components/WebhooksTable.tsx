import { Link, useLocation } from 'react-router-dom';
import type { Webhook } from '@/api';
import type { NavigationState } from '@/routing';
import { text } from '@/i18n';
import { Icon, IconName } from '@ui/components';
import { appStore } from "@/store";
const headerCellClass =
    'border-y border-border bg-subtle px-6 py-[13px] text-xs font-semibold text-[#5b677b] max-desktop:px-[18px]';
const cellClass =
    'h-[58px] border-b border-[#edf0f4] px-6 py-2.5 text-base group-last:border-b-0 max-desktop:px-[18px]';

export function WebhooksTable({ webhooks }: { webhooks: Webhook[] }) {
    const { pathname, search } = useLocation();
    const { state: webhookState, saveState, saveActive } = appStore.webhook;
    const navigationState: NavigationState = { returnTo: pathname + search };
    const onSaveActiveHandler = () => {

    }
    return (
        <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left whitespace-nowrap">
                <thead>
                    <tr>
                        <th className={headerCellClass}>{text.name}</th>
                        <th className={headerCellClass}>{text.url}</th>
                        <th className={headerCellClass}>{text.status}</th>
                        <th className={`${headerCellClass} relative`}>
                            <span className="sr-only">{text.actions}</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {webhooks.map((webhook) => (
                        <tr
                            key={webhook.id}
                            className="group hover:bg-[#f8fbff]"
                        >
                            <td className={cellClass}>
                                <div className="font-semibold">
                                    <Link
                                        className="hover:text-primary hover:underline hover:underline-offset-3"
                                        to={`/webhooks/${webhook.id}/edit`}
                                        state={navigationState}
                                    >
                                        {webhook.name}
                                    </Link>
                                </div>
                            </td>
                            <td className={`${cellClass} text-muted`}>
                                <span
                                    className="block max-w-[310px] truncate text-sm max-desktop:max-w-[210px]"
                                    title={webhook.url}
                                >
                                    {webhook.url}
                                </span>
                            </td>
                            <td className={cellClass}>
                                <span
                                    className={`inline-flex items-center gap-1.5 rounded-[5px] px-[9px] py-1 text-xs font-medium ${webhook.active ? 'bg-positive-soft text-positive' : 'bg-[#f1f3f6] text-muted'}`}
                                >
                                    <span className="size-[5px] rounded-full bg-current" />
                                    <button onClick={() =>{
                                        saveActive.emit({
                                            id: webhook.id,
                                            active: !webhook.active
                                        });
                                    }}>
                                        {webhook.active
                                            ? text.active
                                            : text.inactive}
                                    </button>
                                </span>
                            </td>
                            <td className={cellClass}>
                                <Link
                                    to={`/webhooks/${webhook.id}/edit`}
                                    state={navigationState}
                                    className="grid size-[34px] place-items-center rounded-md text-muted hover:bg-brand-soft hover:text-primary"
                                    aria-label={`${text.edit}: ${webhook.name}`}
                                    title={text.edit}
                                >
                                    <Icon name={IconName.Edit} size={18} />
                                </Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
