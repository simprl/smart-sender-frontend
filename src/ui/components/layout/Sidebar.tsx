import { NavLink } from 'react-router-dom';
import { text } from '@/i18n';
import { Brand, Icon, IconName } from '../common';

export function Sidebar() {
    return (
        <aside className="flex flex-col border-r border-border bg-white px-[18px] pt-[26px] pb-6 max-desktop:px-3.5 max-tablet:flex-row max-tablet:items-center max-tablet:justify-between max-tablet:border-r-0 max-tablet:border-b max-tablet:px-5 max-tablet:py-4">
            <div className="mx-3.5 max-tablet:mx-0">
                <Brand to="/webhooks" />
            </div>
            <span className="mx-3 mt-[30px] mb-2.5 text-xs font-semibold text-muted max-tablet:hidden">
                {text.integrations}
            </span>
            <nav aria-label={text.integrations}>
                <NavLink
                    to="/webhooks"
                    className="flex items-center gap-3 rounded-lg bg-brand-soft px-3 py-[13px] text-base font-semibold text-primary max-tablet:py-3"
                >
                    <Icon name={IconName.Link} />
                    {text.webhooks}
                </NavLink>
            </nav>
        </aside>
    );
}
