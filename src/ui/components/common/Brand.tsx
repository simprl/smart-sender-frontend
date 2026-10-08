import { Link } from 'react-router-dom';

export function Brand({ to }: { to: string }) {
    return (
        <Link to={to} className="inline-flex w-fit items-center">
            <img
                className="block h-auto w-[142px] max-tablet:w-[116px]"
                src="/smart-sender-logo.svg"
                alt="Smart Sender"
            />
        </Link>
    );
}
