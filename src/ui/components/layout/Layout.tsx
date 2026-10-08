import { Outlet } from 'react-router-dom';
import { appStore } from '@/store';
import { text } from '@/i18n';
import { Loading } from '../common';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function Layout() {
    const { state: sessionState, logout } = appStore.session;
    const { user, logoutPending } = sessionState.useValue();
    return (
        <div className="grid min-h-screen grid-cols-[240px_minmax(0,1fr)] max-desktop:grid-cols-[224px_minmax(0,1fr)] max-tablet:grid-cols-1">
            <Sidebar />
            <div className="flex min-w-0 flex-col">
                <Topbar
                    name={user?.name}
                    pending={logoutPending}
                    onLogout={logout}
                />
                <main className="mx-auto w-full max-w-[1440px] flex-1 px-9 pt-9 pb-12 max-desktop:px-6 max-desktop:pt-7 max-desktop:pb-10 max-tablet:px-5">
                    {logoutPending ? (
                        <Loading label={text.loggingOut} />
                    ) : (
                        <Outlet />
                    )}
                </main>
            </div>
        </div>
    );
}
