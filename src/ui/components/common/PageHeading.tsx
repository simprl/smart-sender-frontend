export function PageHeading({
    eyebrow,
    title,
    description,
}: {
    eyebrow: string;
    title: string;
    description: string;
}) {
    return (
        <div className="mb-[26px] flex items-center justify-between gap-5">
            <div>
                <span className="mb-2.5 block text-xs font-semibold text-muted">
                    {eyebrow}
                </span>
                <h1 className="mb-2.5 text-3xl leading-[1.35] font-semibold tracking-[-0.7px] max-phone:text-2xl">
                    {title}
                </h1>
                <p className="text-base leading-[1.7] text-muted">
                    {description}
                </p>
            </div>
        </div>
    );
}
