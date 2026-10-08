export function Loading({ label }: { label: string }) {
    return (
        <div
            className="flex min-h-[280px] items-center justify-center gap-3 text-base text-muted"
            role="status"
        >
            <span className="size-[18px] animate-spin rounded-full border-2 border-[#dce8f6] border-t-brand" />
            {label}
        </div>
    );
}
