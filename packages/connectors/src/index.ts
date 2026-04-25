export * from './sdk/index.js';
export * from './auth/index.js';
export * from './outlook/index.js';
export * from './outlook/connector.js';
export * from './teams/index.js';
export * from './teams/connector.js';

import { BuiltInConnectorRegistry } from './sdk/registry.js';
import './outlook/connector.js';
import './teams/connector.js';

export const BUILTIN_CONNECTOR_MANIFESTS = BuiltInConnectorRegistry.getManifests();
