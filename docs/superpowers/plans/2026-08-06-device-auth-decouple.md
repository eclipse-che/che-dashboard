# Device Auth Decoupled from Git Services OAuth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `getGitHubClientId()` 3-tier fallback and Che Server `isGitHubOAuthConfigured()` check with a single admin-configurable `device-auth-config` ConfigMap that makes device auth fully independent of Git Services OAuth.

**Architecture:** A new route-layer helper `getDeviceAuthClientId()` reads `github_client_id` from a `device-auth-config` ConfigMap in the Che namespace (via SA KubeConfig) and caches the result with a 90 s TTL. `clusterConfig.ts` uses it to set `githubDeviceAuthEnabled`. The device auth route passes the resolved `clientId` to the service — removing all config-reading logic from `deviceAuthTokenApi.ts`.

**Tech Stack:** TypeScript, Fastify, `@kubernetes/client-node`, Jest.

## Global Constraints

- No `any` type; strict TypeScript throughout.
- Absolute imports with `@/` alias only.
- EPL-2.0 copyright header on every new file.
- Assisted-by trailer on the commit.
- Run `yarn format:fix && yarn lint:fix` before committing.
- Run targeted tests with `yarn workspace @eclipse-che/dashboard-backend test --testPathPatterns="<pattern>" --no-cache`.

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| **Create** | `src/routes/api/helpers/getDeviceAuthClientId.ts` | SA-based ConfigMap read + 90 s cache |
| **Create** | `src/routes/api/helpers/__mocks__/getDeviceAuthClientId.ts` | Jest auto-mock for route tests |
| **Create** | `src/routes/api/helpers/__tests__/getDeviceAuthClientId.spec.ts` | Unit tests for the helper |
| **Create** | `src/routes/api/__tests__/deviceAuthToken.spec.ts` | Route-level tests for initiate / poll |
| **Modify** | `src/routes/api/clusterConfig.ts` | Use `getDeviceAuthClientId()` → drop old cache + HTTP call |
| **Modify** | `src/routes/api/__tests__/clusterConfig.spec.ts` | Mock `getDeviceAuthClientId` |
| **Modify** | `src/routes/api/deviceAuthToken.ts` | Resolve `clientId` in route, gate on null |
| **Modify** | `src/devworkspaceClient/types/index.ts` | Add `clientId` param to `initiateDeviceAuth`/`pollDeviceAuth` |
| **Modify** | `src/devworkspaceClient/services/deviceAuthTokenApi.ts` | Accept `clientId` param, delete `getGitHubClientId()` |
| **Modify** | `src/devworkspaceClient/services/__tests__/deviceAuthTokenApi.spec.ts` | Pass `clientId` in all test calls |

---

### Task 1: Create `getDeviceAuthClientId` helper + mock + tests

**Files:**
- Create: `packages/dashboard-backend/src/routes/api/helpers/getDeviceAuthClientId.ts`
- Create: `packages/dashboard-backend/src/routes/api/helpers/__mocks__/getDeviceAuthClientId.ts`
- Create: `packages/dashboard-backend/src/routes/api/helpers/__tests__/getDeviceAuthClientId.spec.ts`

**Interfaces:**
- Produces: `getDeviceAuthClientId(): Promise<string | null>`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/dashboard-backend/src/routes/api/helpers/__tests__/getDeviceAuthClientId.spec.ts
/*
 * Copyright (c) 2018-2025 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import * as mockClient from '@kubernetes/client-node';
import { CoreV1Api } from '@kubernetes/client-node';

jest.mock('@/routes/api/helpers/getServiceAccountToken');
jest.mock('@/devworkspaceClient/services/helpers/retryableExec');

const mockReadNamespacedConfigMap = jest.fn();
const stubCoreV1Api = {
  readNamespacedConfigMap: mockReadNamespacedConfigMap,
} as unknown as CoreV1Api;

describe('getDeviceAuthClientId', () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...origEnv };
    delete process.env.DEVICE_AUTH_GITHUB_CLIENT_ID;
    process.env.CHECLUSTER_CR_NAMESPACE = 'eclipse-che';
    const { KubeConfig } = mockClient;
    KubeConfig.prototype.makeApiClient = jest.fn().mockReturnValue(stubCoreV1Api);
  });

  afterEach(() => {
    process.env = origEnv;
    jest.clearAllMocks();
  });

  it('returns client_id from ConfigMap when present', async () => {
    mockReadNamespacedConfigMap.mockResolvedValueOnce({
      data: { github_client_id: '01ab8ac9400c4e429b23' },
    });
    const { getDeviceAuthClientId } = await import(
      '@/routes/api/helpers/getDeviceAuthClientId'
    );
    const result = await getDeviceAuthClientId();
    expect(result).toBe('01ab8ac9400c4e429b23');
  });

  it('returns null when ConfigMap key is absent', async () => {
    mockReadNamespacedConfigMap.mockResolvedValueOnce({ data: {} });
    const { getDeviceAuthClientId } = await import(
      '@/routes/api/helpers/getDeviceAuthClientId'
    );
    const result = await getDeviceAuthClientId();
    expect(result).toBeNull();
  });

  it('returns null when ConfigMap does not exist (404)', async () => {
    mockReadNamespacedConfigMap.mockRejectedValueOnce(
      Object.assign(new Error('Not Found'), { code: 404 }),
    );
    const { getDeviceAuthClientId } = await import(
      '@/routes/api/helpers/getDeviceAuthClientId'
    );
    const result = await getDeviceAuthClientId();
    expect(result).toBeNull();
  });

  it('returns value from DEVICE_AUTH_GITHUB_CLIENT_ID env var (local dev override)', async () => {
    process.env.DEVICE_AUTH_GITHUB_CLIENT_ID = 'local-override-id';
    const { getDeviceAuthClientId } = await import(
      '@/routes/api/helpers/getDeviceAuthClientId'
    );
    const result = await getDeviceAuthClientId();
    expect(result).toBe('local-override-id');
    expect(mockReadNamespacedConfigMap).not.toHaveBeenCalled();
  });

  it('returns null when CHECLUSTER_CR_NAMESPACE is not set', async () => {
    delete process.env.CHECLUSTER_CR_NAMESPACE;
    const { getDeviceAuthClientId } = await import(
      '@/routes/api/helpers/getDeviceAuthClientId'
    );
    const result = await getDeviceAuthClientId();
    expect(result).toBeNull();
    expect(mockReadNamespacedConfigMap).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
yarn workspace @eclipse-che/dashboard-backend test --testPathPatterns="getDeviceAuthClientId" --no-cache
```

Expected: Module not found error.

- [ ] **Step 3: Implement the helper**

```typescript
// packages/dashboard-backend/src/routes/api/helpers/getDeviceAuthClientId.ts
/*
 * Copyright (c) 2018-2025 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import * as k8s from '@kubernetes/client-node';

import { prepareCoreV1API } from '@/devworkspaceClient/services/helpers/prepareCoreV1API';
import { getServiceAccountToken } from '@/routes/api/helpers/getServiceAccountToken';
import { KubeConfigProvider } from '@/services/kubeclient/kubeConfigProvider';

const DEVICE_AUTH_CONFIG_MAP = 'device-auth-config';
const GITHUB_CLIENT_ID_KEY = 'github_client_id';
const CACHE_TTL_MS = 90_000;

let cache: { value: string | null; expiresAt: number } | null = null;

export async function getDeviceAuthClientId(): Promise<string | null> {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.value;
  }

  const value = await resolveClientId();
  cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

async function resolveClientId(): Promise<string | null> {
  // Local dev / CI override
  if (process.env.DEVICE_AUTH_GITHUB_CLIENT_ID) {
    return process.env.DEVICE_AUTH_GITHUB_CLIENT_ID;
  }

  const namespace = process.env.CHECLUSTER_CR_NAMESPACE;
  if (!namespace) {
    return null;
  }

  try {
    const token = getServiceAccountToken();
    const kc = new KubeConfigProvider().getKubeConfig(token);
    const coreV1API = prepareCoreV1API(kc);
    const configMap = await coreV1API.readNamespacedConfigMap({
      name: DEVICE_AUTH_CONFIG_MAP,
      namespace,
    });
    const clientId = configMap.data?.[GITHUB_CLIENT_ID_KEY]?.trim() ?? '';
    return clientId || null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Create the mock**

```typescript
// packages/dashboard-backend/src/routes/api/helpers/__mocks__/getDeviceAuthClientId.ts
/*
 * Copyright (c) 2018-2025 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

export const stubDeviceAuthClientId: string | null = null;

export async function getDeviceAuthClientId(): Promise<string | null> {
  return stubDeviceAuthClientId;
}
```

- [ ] **Step 5: Run the test to confirm it passes**

```bash
yarn workspace @eclipse-che/dashboard-backend test --testPathPatterns="getDeviceAuthClientId" --no-cache
```

Expected: All 5 tests pass.

- [ ] **Step 6: Format and lint**

```bash
yarn format:fix && yarn lint:fix
```

- [ ] **Step 7: Commit**

```bash
git add packages/dashboard-backend/src/routes/api/helpers/getDeviceAuthClientId.ts \
  packages/dashboard-backend/src/routes/api/helpers/__mocks__/getDeviceAuthClientId.ts \
  packages/dashboard-backend/src/routes/api/helpers/__tests__/getDeviceAuthClientId.spec.ts
git commit -m "feat(device-auth): add getDeviceAuthClientId helper reading device-auth-config ConfigMap"
```

---

### Task 2: Update `IDeviceAuthTokenApi` interface and `deviceAuthTokenApi.ts` service

**Files:**
- Modify: `packages/dashboard-backend/src/devworkspaceClient/types/index.ts:642-648`
- Modify: `packages/dashboard-backend/src/devworkspaceClient/services/deviceAuthTokenApi.ts`
- Modify: `packages/dashboard-backend/src/devworkspaceClient/services/__tests__/deviceAuthTokenApi.spec.ts`

**Interfaces:**
- Consumes: nothing from Task 1 (service layer is isolated)
- Produces: `initiateDeviceAuth(namespace: string, clientId: string): Promise<DeviceCodeResponse>`, `pollDeviceAuth(namespace: string, deviceCode: string, clientId: string): Promise<DeviceAuthPollResult>`

- [ ] **Step 1: Update the interface in `types/index.ts`**

Find lines 642–648 and replace:
```typescript
  initiateDeviceAuth(namespace: string): Promise<DeviceCodeResponse>;
  // ...
  pollDeviceAuth(namespace: string, deviceCode: string): Promise<DeviceAuthPollResult>;
```
with:
```typescript
  initiateDeviceAuth(namespace: string, clientId: string): Promise<DeviceCodeResponse>;
  // ...
  pollDeviceAuth(namespace: string, deviceCode: string, clientId: string): Promise<DeviceAuthPollResult>;
```

Full replacement block (lines 639–649 in `types/index.ts`):
```typescript
  /**
   * Initiates a GitHub Device Authorization flow and returns the device code and user code.
   */
  initiateDeviceAuth(namespace: string, clientId: string): Promise<DeviceCodeResponse>;

  /**
   * Polls GitHub for the access token using the device code.
   * On success, stores the token as a Kubernetes secret.
   */
  pollDeviceAuth(namespace: string, deviceCode: string, clientId: string): Promise<DeviceAuthPollResult>;
  validateToken(namespace: string, tokenName: string): Promise<'valid' | 'invalid' | 'unknown'>;
```

- [ ] **Step 2: Update `deviceAuthTokenApi.ts` service**

Remove these items from the service file:
- `import { existsSync, readFileSync } from 'fs';`
- `const GITHUB_OAUTH_ID_FILE` constant
- The entire `getGitHubClientId()` async function (lines ~66–111)

Change `initiateDeviceAuth`:
```typescript
async initiateDeviceAuth(namespace: string, clientId: string): Promise<DeviceCodeResponse> {
  const data = await githubPostDeviceCode({
    client_id: clientId,
    scope: GITHUB_SCOPES,
  });
  if (!data.device_code || !data.user_code || !data.verification_uri) {
    if (data.error === 'device_flow_disabled' || data.error === 'device_flow_not_enabled') {
      throw new Error(
        'Device Flow is not enabled for this GitHub OAuth App. ' +
          'An administrator must enable it at GitHub Settings → Developer settings → OAuth Apps.',
      );
    }
    throw new Error(
      `Failed to initiate device auth: ${data.error_description ?? JSON.stringify(data)}`,
    );
  }
  const expiresAt = Date.now() + (data.expires_in ?? 900) * 1_000;
  activeDeviceCodes.set(namespace, { code: data.device_code, expiresAt });
  return {
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUri: data.verification_uri,
    interval: data.interval ?? 5,
  };
}
```

Change `pollDeviceAuth`:
```typescript
async pollDeviceAuth(namespace: string, deviceCode: string, clientId: string): Promise<DeviceAuthPollResult> {
  const stored = activeDeviceCodes.get(namespace);
  if (!stored || stored.code !== deviceCode || Date.now() > stored.expiresAt) {
    if (stored && Date.now() > stored.expiresAt) {
      activeDeviceCodes.delete(namespace);
    }
    return {
      status: 'error',
      message: 'Device code is not valid for this session. Please initiate a new connection.',
    };
  }
  const data = await githubPostToken({
    client_id: clientId,
    device_code: deviceCode,
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
  });

  if (data.error === 'authorization_pending') {
    return { status: 'pending' };
  }
  if (data.error === 'slow_down') {
    return { status: 'slow_down' };
  }
  if (data.error === 'expired_token') {
    return { status: 'expired' };
  }
  if (data.error) {
    return { status: 'error', message: data.error_description ?? data.error };
  }
  if (!data.access_token) {
    return { status: 'error', message: 'No access_token in response' };
  }

  activeDeviceCodes.delete(namespace);
  const token = await this.createDeviceAuthSecret(namespace, data.access_token);
  return { status: 'authorized', token };
}
```

- [ ] **Step 3: Update the service unit tests**

In `deviceAuthTokenApi.spec.ts`:
- Remove the `origClientId` / `process.env.CHE_GITHUB_OAUTH_CLIENT_ID` setup in `initiateDeviceAuth` and `pollDeviceAuth` describe blocks.
- Pass `'test-client-id'` as the `clientId` argument to every `service.initiateDeviceAuth(namespace, 'test-client-id')` and `service.pollDeviceAuth(namespace, 'dev-code-123', 'test-client-id')` call.
- Remove the test "should throw when CHE_GITHUB_OAUTH_CLIENT_ID is not set" (no longer applicable).

- [ ] **Step 4: Run the service tests**

```bash
yarn workspace @eclipse-che/dashboard-backend test --testPathPatterns="deviceAuthTokenApi" --no-cache
```

Expected: All tests pass.

- [ ] **Step 5: Format and lint**

```bash
yarn format:fix && yarn lint:fix
```

- [ ] **Step 6: Commit**

```bash
git add packages/dashboard-backend/src/devworkspaceClient/types/index.ts \
  packages/dashboard-backend/src/devworkspaceClient/services/deviceAuthTokenApi.ts \
  packages/dashboard-backend/src/devworkspaceClient/services/__tests__/deviceAuthTokenApi.spec.ts
git commit -m "refactor(device-auth): accept clientId param; remove 3-tier getGitHubClientId fallback"
```

---

### Task 3: Update `clusterConfig.ts` and its spec

**Files:**
- Modify: `packages/dashboard-backend/src/routes/api/clusterConfig.ts`
- Modify: `packages/dashboard-backend/src/routes/api/__tests__/clusterConfig.spec.ts`

**Interfaces:**
- Consumes: `getDeviceAuthClientId()` from Task 1

- [ ] **Step 1: Update `clusterConfig.ts`**

Replace the entire file with:
```typescript
/*
 * Copyright (c) 2018-2025 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { ClusterConfig } from '@eclipse-che/common';
import { FastifyInstance } from 'fastify';

import { baseApiPath } from '@/constants/config';
import { getDeviceAuthClientId } from '@/routes/api/helpers/getDeviceAuthClientId';
import { getDevWorkspaceClient } from '@/routes/api/helpers/getDevWorkspaceClient';
import { getServiceAccountToken } from '@/routes/api/helpers/getServiceAccountToken';
import { getSchema } from '@/services/helpers';

const tags = ['Cluster Config'];

export function registerClusterConfigRoute(instance: FastifyInstance) {
  instance.register(async server => {
    server.get(`${baseApiPath}/cluster-config`, getSchema({ tags }), async () =>
      buildClusterConfig(),
    );
  });
}

async function buildClusterConfig(): Promise<ClusterConfig> {
  const token = getServiceAccountToken();
  const { serverConfigApi } = getDevWorkspaceClient(token);

  const cheCustomResource = await serverConfigApi.fetchCheCustomResource();
  const dashboardWarning = serverConfigApi.getDashboardWarning(cheCustomResource);
  const runningWorkspacesLimit = serverConfigApi.getRunningWorkspacesLimit(cheCustomResource);
  const allWorkspacesLimit = serverConfigApi.getAllWorkspacesLimit(cheCustomResource);
  const dashboardFavicon = serverConfigApi.getDashboardLogo(cheCustomResource);
  const currentArchitecture = await serverConfigApi.getCurrentArchitecture();
  const clientId = await getDeviceAuthClientId();

  return {
    dashboardWarning,
    dashboardFavicon,
    allWorkspacesLimit,
    runningWorkspacesLimit,
    currentArchitecture,
    githubDeviceAuthEnabled: clientId !== null,
  };
}
```

- [ ] **Step 2: Update `clusterConfig.spec.ts`**

Add `jest.mock('../helpers/getDeviceAuthClientId.ts');` at the top with the other mocks. The auto-mock returns `null` (from the `__mocks__` file written in Task 1), so `githubDeviceAuthEnabled` stays `false` — no assertion changes needed.

Full updated spec (only the mock line changes):
```typescript
jest.mock('../helpers/getServiceAccountToken.ts');
jest.mock('../helpers/getDevWorkspaceClient.ts');
jest.mock('../helpers/getDeviceAuthClientId.ts');
```

- [ ] **Step 3: Run the clusterConfig spec**

```bash
yarn workspace @eclipse-che/dashboard-backend test --testPathPatterns="clusterConfig" --no-cache
```

Expected: 1 test passes.

- [ ] **Step 4: Format and lint**

```bash
yarn format:fix && yarn lint:fix
```

- [ ] **Step 5: Commit**

```bash
git add packages/dashboard-backend/src/routes/api/clusterConfig.ts \
  packages/dashboard-backend/src/routes/api/__tests__/clusterConfig.spec.ts
git commit -m "refactor(device-auth): use device-auth-config ConfigMap for githubDeviceAuthEnabled"
```

---

### Task 4: Update `deviceAuthToken.ts` route + add route-level spec

**Files:**
- Modify: `packages/dashboard-backend/src/routes/api/deviceAuthToken.ts`
- Create: `packages/dashboard-backend/src/routes/api/__tests__/deviceAuthToken.spec.ts`

**Interfaces:**
- Consumes: `getDeviceAuthClientId()` from Task 1; `initiateDeviceAuth(namespace, clientId)` / `pollDeviceAuth(namespace, deviceCode, clientId)` from Task 2

- [ ] **Step 1: Update `deviceAuthToken.ts`**

Add `import { getDeviceAuthClientId } from '@/routes/api/helpers/getDeviceAuthClientId';` at the top.

Replace the `initiate` route handler body:
```typescript
async function (request: FastifyRequest, reply: FastifyReply) {
  const clientId = await getDeviceAuthClientId();
  if (!clientId) {
    return reply.code(503).send({
      message:
        'GitHub device auth is not configured. Create a device-auth-config ConfigMap in the Che namespace.',
    });
  }
  const { namespace } = request.params as restParams.INamespacedParams;
  const token = getToken(request);
  const { deviceAuthTokenApi } = getDevWorkspaceClient(token);
  return deviceAuthTokenApi.initiateDeviceAuth(namespace, clientId);
},
```

Replace the `poll` route handler body:
```typescript
async function (request: FastifyRequest, reply: FastifyReply) {
  const clientId = await getDeviceAuthClientId();
  if (!clientId) {
    return reply.code(503).send({
      message:
        'GitHub device auth is not configured. Create a device-auth-config ConfigMap in the Che namespace.',
    });
  }
  const { namespace } = request.params as restParams.INamespacedParams;
  const { deviceCode } = request.body as { deviceCode: string };
  const token = getToken(request);
  const { deviceAuthTokenApi } = getDevWorkspaceClient(token);
  return deviceAuthTokenApi.pollDeviceAuth(namespace, deviceCode, clientId);
},
```

Add `FastifyReply` to the `fastify` import.

- [ ] **Step 2: Write the route spec**

```typescript
// packages/dashboard-backend/src/routes/api/__tests__/deviceAuthToken.spec.ts
/*
 * Copyright (c) 2018-2025 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { FastifyInstance } from 'fastify';

import { baseApiPath } from '@/constants/config';
import {
  stubDeviceAuthClientId,
} from '@/routes/api/helpers/__mocks__/getDeviceAuthClientId';
import { setup, teardown } from '@/utils/appBuilder';

jest.mock('../helpers/getServiceAccountToken.ts');
jest.mock('../helpers/getDevWorkspaceClient.ts');
jest.mock('../helpers/getDeviceAuthClientId.ts');

// Allow the mock to be overridden per test
let mockClientId: string | null = stubDeviceAuthClientId;
jest.mock('@/routes/api/helpers/getDeviceAuthClientId', () => ({
  getDeviceAuthClientId: () => Promise.resolve(mockClientId),
}));

const namespace = 'user-che';

describe('Device Auth Token Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await setup();
  });

  afterAll(() => {
    teardown(app);
  });

  beforeEach(() => {
    mockClientId = null;
  });

  describe('POST /initiate', () => {
    it('returns 503 when device auth is not configured', async () => {
      mockClientId = null;
      const res = await app.inject({
        method: 'POST',
        url: `${baseApiPath}/namespace/${namespace}/device-auth-token/initiate`,
      });
      expect(res.statusCode).toBe(503);
    });

    it('calls initiateDeviceAuth with clientId when configured', async () => {
      mockClientId = 'test-client-id';
      // getDevWorkspaceClient mock returns stub that throws; 500 is expected but 503 must not occur
      const res = await app.inject({
        method: 'POST',
        url: `${baseApiPath}/namespace/${namespace}/device-auth-token/initiate`,
      });
      expect(res.statusCode).not.toBe(503);
    });
  });

  describe('POST /poll', () => {
    it('returns 503 when device auth is not configured', async () => {
      mockClientId = null;
      const res = await app.inject({
        method: 'POST',
        url: `${baseApiPath}/namespace/${namespace}/device-auth-token/poll`,
        payload: { deviceCode: 'ABCD-1234' },
      });
      expect(res.statusCode).toBe(503);
    });

    it('does not return 503 when configured', async () => {
      mockClientId = 'test-client-id';
      const res = await app.inject({
        method: 'POST',
        url: `${baseApiPath}/namespace/${namespace}/device-auth-token/poll`,
        payload: { deviceCode: 'ABCD-1234' },
      });
      expect(res.statusCode).not.toBe(503);
    });
  });
});
```

- [ ] **Step 3: Run the route spec**

```bash
yarn workspace @eclipse-che/dashboard-backend test --testPathPatterns="deviceAuthToken.spec" --no-cache
```

Expected: All tests pass.

- [ ] **Step 4: Run the full backend test suite to confirm no regressions**

```bash
yarn workspace @eclipse-che/dashboard-backend test --no-cache 2>&1 | tail -20
```

Expected: All suites pass.

- [ ] **Step 5: Format and lint**

```bash
yarn format:fix && yarn lint:fix
```

- [ ] **Step 6: Commit**

```bash
git add packages/dashboard-backend/src/routes/api/deviceAuthToken.ts \
  packages/dashboard-backend/src/routes/api/__tests__/deviceAuthToken.spec.ts
git commit -m "feat(device-auth): gate initiate/poll on device-auth-config; pass clientId from route"
```

---

## Self-Review Checklist

- [x] Spec coverage: ConfigMap read ✓, TTL cache ✓, `githubDeviceAuthEnabled` via ConfigMap ✓, service `clientId` param ✓, 503 gate on routes ✓, 3-tier fallback removed ✓, no Che Server call for device auth ✓, no env-var injection dependency ✓
- [x] Placeholder scan: all code blocks are complete and self-contained
- [x] Type consistency: `initiateDeviceAuth(namespace: string, clientId: string)` and `pollDeviceAuth(namespace: string, deviceCode: string, clientId: string)` used consistently across Task 2, 3, and 4
