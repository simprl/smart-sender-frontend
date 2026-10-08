import type { ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { twMerge } from 'tailwind-merge';

export enum ButtonVariant {
    Primary = 'primary',
    Secondary = 'secondary',
    Text = 'text',
}

interface Appearance {
    variant?: ButtonVariant;
    fullWidth?: boolean;
    className?: string;
}

export function Button({
    variant,
    fullWidth,
    className,
    type = 'button',
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & Appearance) {
    return (
        <button
            {...props}
            type={type}
            className={buttonClass({ variant, fullWidth, className })}
        />
    );
}

export function ButtonLink({
    variant = ButtonVariant.Secondary,
    fullWidth,
    className,
    ...props
}: LinkProps & Appearance) {
    return (
        <Link
            {...props}
            className={buttonClass({ variant, fullWidth, className })}
        />
    );
}

function buttonClass({
    variant = ButtonVariant.Primary,
    fullWidth,
    className,
}: Appearance) {
    return twMerge(
        variant === ButtonVariant.Text
            ? 'inline-flex items-center gap-2 border-0 bg-transparent p-0 text-sm font-semibold text-primary hover:underline'
            : 'inline-flex min-h-[44px] items-center justify-center gap-[9px] rounded-lg border border-transparent px-[18px] py-2.5 text-base font-semibold transition-[background,box-shadow] duration-150',
        variant === ButtonVariant.Primary &&
            'bg-primary text-white not-disabled:hover:bg-primary-hover not-disabled:hover:shadow-[0_3px_8px_#0866d91a]',
        variant === ButtonVariant.Secondary &&
            'border-[#d6dde7] bg-white text-[#475467] not-disabled:hover:border-[#b8c5d6] not-disabled:hover:bg-[#f5f8fc]',
        fullWidth && 'mt-[3px] min-h-[46px] w-full',
        className,
    );
}
