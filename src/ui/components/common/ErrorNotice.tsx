import { type RequestError, HttpStatus, RequestErrorStatus } from '@/api';
import { text } from '@/i18n';
import { Button, ButtonVariant } from './Button';

interface Props {
    error?: RequestError | null;
    onRetry?: () => void;
    reserveSpace?: boolean;
    flush?: boolean;
}

export function ErrorNotice({
    error,
    onRetry,
    reserveSpace = false,
    flush = false,
}: Props) {
    if (!error) {
        return reserveSpace ? (
            <div className="relative h-5" aria-hidden="true" />
        ) : null;
    }
    const message = errorMessage(error);
    const className = noticeClass({ reserveSpace, flush });
    const notice = (
        <div role="alert" className={className}>
            <span>{message}</span>
            {onRetry && (
                <Button variant={ButtonVariant.Text} onClick={onRetry}>
                    {text.retry}
                </Button>
            )}
        </div>
    );
    return reserveSpace ? <div className="relative h-5">{notice}</div> : notice;
}

function errorMessage(error: RequestError) {
    if (error.status === RequestErrorStatus.NetworkError) {
        return text.networkError;
    }
    if (error.status === HttpStatus.UnprocessableEntity) {
        return text.validationError;
    }
    return text.requestError;
}

function noticeClass({
    reserveSpace,
    flush,
}: Pick<Props, 'reserveSpace' | 'flush'>) {
    const baseClass = 'flex flex-wrap items-center gap-3 text-danger';
    if (reserveSpace) {
        return `${baseClass} absolute inset-x-0 bottom-0 rounded-lg bg-transparent p-0 text-sm leading-[14px]`;
    }
    const spacingClass = flush ? 'm-0 rounded-none' : 'mb-5 rounded-lg';
    return `${baseClass} bg-danger-soft px-4 py-[13px] text-base leading-[1.5] ${spacingClass}`;
}
