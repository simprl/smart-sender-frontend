import { setupWorker } from 'msw/browser';
import { createHandlers, createMockState } from './handlers';

const state = createMockState();
export const worker = setupWorker(...createHandlers(state));
