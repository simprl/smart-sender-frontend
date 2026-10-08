import type { ReactNode } from 'react';

export enum NoticeVariant {
    Info = 'info',
    Success = 'success',
}

export function Notice({
    children,
    variant = NoticeVariant.Info,
}: {
    children: ReactNode;
    variant?: NoticeVariant;
}) {
    return (
        <p
            role="status"
            className={`mb-5 flex items-center gap-3 rounded-lg px-4 py-[13px] text-base leading-[1.5] ${variant === NoticeVariant.Success ? 'bg-positive-soft text-positive' : 'bg-[#fff8e8] text-[#805b12]'}`}
        >
            {children}
        </p>
    );
}
