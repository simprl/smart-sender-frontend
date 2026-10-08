import { createApiClient } from './client';
import { getFingerprint } from './fingerprint';

export const apiClient = createApiClient({ baseUrl: '', getFingerprint });
