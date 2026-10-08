import { appStore, SaveStatus } from '@/store';
import { text } from '@/i18n';
import {
    Button,
    ButtonLink,
    ErrorNotice,
    Icon,
    TextField,
    IconName,
} from '@ui/components';

export function WebhookForm({ backLink }: { backLink: string }) {
    const { state: webhookState, saveState, save } = appStore.webhook;
    const resource = webhookState.useValue();
    const saveStatus = saveState.useValue();
    const webhook = resource.data;
    if (!webhook) {
        return null;
    }
    const isSaving =
        saveStatus.id === webhook.id &&
        saveStatus.status === SaveStatus.Pending;
    const isDisabled = resource.pending || isSaving;
    const error =
        saveStatus.id === webhook.id && saveStatus.status === SaveStatus.Error
            ? saveStatus.error
            : undefined;
    return (
        <form
            className="max-w-[760px] overflow-hidden rounded-lg border border-border bg-white shadow-card"
            noValidate
            onSubmit={(event) => {
                event.preventDefault();
                save();
            }}
        >
            <div className="flex items-center gap-4 border-b border-border px-7 py-6 max-phone:px-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-brand-tint text-primary">
                    <Icon name={IconName.Link} size={24} />
                </span>
                <div>
                    <h2 className="mb-1.5 text-lg font-semibold">
                        {text.details}
                    </h2>
                    <p className="text-sm leading-[1.6] text-muted">
                        {text.detailsHint}
                    </p>
                </div>
            </div>
            <div className="px-7 pt-7 pb-1 max-phone:px-5">
                <ErrorNotice error={error} reserveSpace />
                <TextField
                    id="webhook-name"
                    label={text.name}
                    value={webhook.name}
                    disabled={isDisabled}
                    required
                    autoComplete="off"
                    onChange={(event) =>
                        webhookState.set({
                            ...resource,
                            data: { ...webhook, name: event.target.value },
                        })
                    }
                    errors={error?.fields?.name}
                    hint={text.nameHint}
                />
                <TextField
                    id="webhook-url"
                    label={text.url}
                    type="url"
                    value={webhook.url}
                    disabled={isDisabled}
                    required
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(event) =>
                        webhookState.set({
                            ...resource,
                            data: { ...webhook, url: event.target.value },
                        })
                    }
                    errors={error?.fields?.url}
                    hint={text.urlHint}
                />
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-border bg-[#fafbfd] px-7 py-[18px] max-phone:flex-wrap max-phone:px-5">
                {isSaving ? (
                    <span className="text-base leading-[1.7] text-muted">
                        {text.saving}
                    </span>
                ) : (
                    <ButtonLink to={backLink}>{text.cancel}</ButtonLink>
                )}
                <Button type="submit" disabled={isDisabled}>
                    {isSaving ? text.saving : text.save}
                    <Icon name={IconName.Check} size={18} />
                </Button>
            </div>
        </form>
    );
}
