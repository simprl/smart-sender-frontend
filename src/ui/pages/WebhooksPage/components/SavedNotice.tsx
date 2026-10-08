import { appStore, NotificationType } from '@/store';
import { text } from '@/i18n';
import { Icon, Notice, NoticeVariant, IconName } from '@ui/components';

export function SavedNotice() {
    const notification = appStore.notificationState.useValue();
    if (notification !== NotificationType.WebhookSaved) {
        return null;
    }
    return (
        <Notice variant={NoticeVariant.Success}>
            <Icon name={IconName.Check} size={17} />
            {text.saved}
        </Notice>
    );
}
