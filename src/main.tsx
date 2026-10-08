import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from '@/App';
import { text } from '@/i18n';
import '@/styles/global.css';

async function main() {
    // This assignment intentionally uses MSW in both dev and the production preview.
    const { worker } = await import('@/mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass', quiet: true });
    createRoot(document.getElementById('root')!).render(
        <StrictMode>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </StrictMode>,
    );
}

void main().catch((error: unknown) => {
    console.error('Application startup failed', error);
    const root = document.getElementById('root');
    if (root) {
        root.textContent = text.bootstrapError;
    }
});
