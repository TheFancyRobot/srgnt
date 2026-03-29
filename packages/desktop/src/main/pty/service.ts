/**
 * PTY Service barrel re-export.
 *
 * Canonical sources:
 *   - contracts.ts  → Effect Schema schemas and inferred types
 *   - session-manager.ts → PtySessionManager + PtySession
 *   - node-pty-service.ts → PtyService factory (node-pty backed)
 */
export { SPtyProcessOptions, SPtyProcess, SPtyServiceEvents } from './contracts.js';
export type { PtyProcessOptions, PtyProcess, PtyServiceEvents } from './contracts.js';
export { PtySessionManager, createPtySessionManager } from './session-manager.js';
export type { PtySession, PtySessionContext } from './session-manager.js';
export { createPtyService } from './node-pty-service.js';
export type { PtyService, PtyServiceDeps } from './node-pty-service.js';
