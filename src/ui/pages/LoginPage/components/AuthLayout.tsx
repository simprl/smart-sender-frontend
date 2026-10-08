import type { ReactNode } from 'react';

export function AuthLayout({
    welcome,
    children,
}: {
    welcome: ReactNode;
    children: ReactNode;
}) {
    return (
        <main className="grid min-h-screen grid-cols-2 max-tablet:grid-cols-1">
            {welcome}
            <section
                className="flex items-center justify-center bg-white px-10 py-16 max-tablet:min-h-[calc(100vh-94px)] max-tablet:px-6 max-tablet:py-10"
                aria-labelledby="login-title"
            >
                {children}
            </section>
        </main>
    );
}
