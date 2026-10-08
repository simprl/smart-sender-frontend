import { text } from '@/i18n';
import { Brand, Icon, IconName } from '@ui/components';

export function WelcomePanel() {
    return (
        <section className="flex flex-col bg-brand-tint px-16 pt-10 pb-8 max-desktop:px-9 max-tablet:border-b max-tablet:border-border max-tablet:bg-white max-tablet:px-7 max-tablet:py-5">
            <Brand to="/" />
            <div className="my-auto max-w-[460px] py-16 max-tablet:hidden">
                <p className="mb-5 text-base leading-6 font-semibold tracking-[1.4px] text-primary">
                    {text.welcomeEyebrow}
                </p>
                <h1 className="text-[clamp(30px,3vw,44px)] leading-[1.25] font-semibold tracking-[-1.4px] whitespace-pre-line">
                    {text.welcomeTitle}
                </h1>
                <p className="mt-[22px] max-w-[350px] text-[15px] leading-[1.8] text-[#5c6f87]">
                    {text.welcomeDescription}
                </p>
                <div
                    className="mt-12 flex w-full max-w-[330px] items-center"
                    aria-hidden="true"
                >
                    <span className="grid size-15 shrink-0 place-items-center rounded-xl border border-[#d7e6f8] bg-white text-primary">
                        <Icon name={IconName.Event} size={26} />
                    </span>
                    <span className="h-0.5 flex-1 bg-[#b9d7fb]" />
                    <span className="grid size-21 shrink-0 place-items-center rounded-2xl bg-brand text-white shadow-[0_8px_24px_#1380f626]">
                        <Icon name={IconName.Link} size={40} />
                    </span>
                    <span className="h-0.5 flex-1 bg-[#b9d7fb]" />
                    <span className="grid size-15 shrink-0 place-items-center rounded-xl border border-[#d7e6f8] bg-white text-primary">
                        <Icon name={IconName.Check} size={26} />
                    </span>
                </div>
            </div>
            <p className="text-xs text-[#627793] max-tablet:hidden">
                {text.welcomeFooter}
            </p>
        </section>
    );
}
