import type { InputHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
    id: string;
    label: string;
    errors?: string[];
    hint?: string;
}

export function TextField({
    id,
    label,
    errors,
    hint,
    className,
    ...inputProps
}: Props) {
    const hasError = Boolean(errors?.length);
    const feedbackId = `${id}-${hasError ? 'error' : 'hint'}`;
    return (
        <label
            className="mb-2 flex flex-col text-base font-semibold"
            htmlFor={id}
        >
            {label}
            <input
                {...inputProps}
                className={twMerge(
                    'mt-2 min-h-[44px] w-full rounded-lg border border-input-border bg-white px-[13px] py-[11px] text-base text-ink transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-placeholder focus:border-brand focus:shadow-[0_0_0_3px_#1380f61a] disabled:bg-canvas aria-invalid:border-[#cf4242]',
                    className,
                )}
                id={id}
                aria-invalid={hasError}
                aria-describedby={hasError || hint ? feedbackId : undefined}
            />
            <span className="relative mt-0.5 block min-h-[14px] text-xs leading-[14px] font-normal">
                {hint && (
                    <span
                        id={hasError ? undefined : feedbackId}
                        className={`text-muted ${hasError ? 'invisible' : ''}`}
                    >
                        {hint}
                    </span>
                )}
                {hasError && (
                    <span
                        id={feedbackId}
                        className="absolute inset-x-0 top-0 text-sm text-danger"
                    >
                        {errors?.join(' ')}
                    </span>
                )}
            </span>
        </label>
    );
}
