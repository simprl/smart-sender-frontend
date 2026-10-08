import type { ReactNode } from 'react';

export function EmptyState({
    title,
    description,
    icon,
    children,
}: {
    title: string;
    description?: string;
    icon?: ReactNode;
    children?: ReactNode;
}) {
    return (
        <div className="px-6 py-16 text-center">
            {icon && (
                <span className="mb-[18px] inline-grid size-14 place-items-center rounded-xl bg-brand-tint text-primary">
                    {icon}
                </span>
            )}
            <h2 className="mb-2.5 text-xl">{title}</h2>
            {description && (
                <p className="mb-5 text-base text-muted">{description}</p>
            )}
            {children}
        </div>
    );
}
