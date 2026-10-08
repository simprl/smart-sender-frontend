export enum IconName {
    Link = 'link',
    Search = 'search',
    Arrow = 'arrow',
    Logout = 'logout',
    Check = 'check',
    Refresh = 'refresh',
    Edit = 'edit',
    Event = 'event',
}

interface Props {
    name: IconName;
    size?: number;
}
const paths: Record<IconName, string> = {
    [IconName.Edit]: 'm15 5 4 4M4 20l5-1L20 8a2.8 2.8 0 0 0-4-4L5 15l-1 5Z',
    [IconName.Event]: 'M14 3 5 14h7l-2 7 9-11h-7l2-7Z',
    [IconName.Link]:
        'M10 13a5 5 0 0 0 7 .5l3-3a5 5 0 0 0-7-7l-1.5 1.5M14 11a5 5 0 0 0-7-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5',
    [IconName.Search]: 'm16 16 4 4M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    [IconName.Arrow]: 'M5 12h14m-5-5 5 5-5 5',
    [IconName.Logout]: 'M9 5H4v14h5m3-7h9m-4-4 4 4-4 4',
    [IconName.Check]: 'm5 12 4 4L19 6',
    [IconName.Refresh]:
        'M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 13 2M5 16a8 8 0 0 0 13 2',
};

export function Icon({ name, size = 20 }: Props) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d={paths[name]} />
        </svg>
    );
}
