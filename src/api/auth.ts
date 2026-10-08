import { HttpMethod } from './http';
import type { Credentials, User } from './types';
import { getFingerprint } from './fingerprint';
import { apiClient } from './runtime';

export async function login(
    credentials: Credentials,
    signal?: AbortSignal,
): Promise<User> {
    const fingerprint = getFingerprint();
    // The device token exists only in this function's memory, never in the store.
    const { device_session_token } = await apiClient.request<{
        device_session_token: string;
    }>('/auth/login', {
        method: HttpMethod.Post,
        signal,
        body: { ...credentials, fingerprint },
        headers: { 'X-Captcha-Token': 'demo-captcha' },
    });
    await apiClient.request('/auth/token/issue', {
        method: HttpMethod.Post,
        signal,
        body: { device_session_token, fingerprint },
    });
    signal?.throwIfAborted();
    apiClient.startSession();
    try {
        return await apiClient.request<User>('/v1/me', {
            protected: true,
            signal,
        });
    } catch (error) {
        if (!signal?.aborted) {
            apiClient.endSession();
        }
        throw error;
    }
}

export async function logout(signal?: AbortSignal): Promise<void> {
    apiClient.endSession();
    await apiClient.request('/auth/token/revoke', {
        method: HttpMethod.Post,
        signal,
        body: { fingerprint: getFingerprint() },
    });
}
