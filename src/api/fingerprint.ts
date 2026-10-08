const KEY = 'smart-sender.fingerprint';

export function getFingerprint(): string {
    const existing = localStorage.getItem(KEY);
    if (existing && /^[a-f0-9]{32}$/.test(existing)) {
        return existing;
    }
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    const fingerprint = Array.from(bytes, (byte) =>
        byte.toString(16).padStart(2, '0'),
    ).join('');
    localStorage.setItem(KEY, fingerprint);
    return fingerprint;
}
