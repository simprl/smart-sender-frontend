import { text } from '@/i18n';
const pageButtonClass =
    'grid h-[34px] min-w-[34px] place-items-center rounded-md border text-sm';
const defaultPageClass = `${pageButtonClass} border-transparent bg-white text-muted not-disabled:hover:bg-[#f1f5fa] disabled:opacity-35`;

export function Pagination({
    page,
    last,
    onPageChange,
}: {
    page: number;
    last: number;
    onPageChange: (page: number) => void;
}) {
    return (
        <nav className="flex items-center gap-1.5" aria-label={text.pagination}>
            <button
                className={defaultPageClass}
                disabled={page <= 1}
                aria-label={text.prev}
                onClick={() => onPageChange(page - 1)}
            >
                ‹
            </button>
            {Array.from({ length: last }, (_, i) => i + 1).map((number) => (
                <button
                    key={number}
                    className={
                        number === page
                            ? `${pageButtonClass} border-[#d4e6fc] bg-brand-soft font-semibold text-primary`
                            : defaultPageClass
                    }
                    aria-current={number === page ? 'page' : undefined}
                    aria-label={text.page(number, last)}
                    onClick={() => onPageChange(number)}
                >
                    {number}
                </button>
            ))}
            <button
                className={defaultPageClass}
                disabled={page >= last}
                aria-label={text.next}
                onClick={() => onPageChange(page + 1)}
            >
                ›
            </button>
        </nav>
    );
}
