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

import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

import { SandboxSample } from '@/services/samples';
import { getSandboxOriginalManifest } from '@/services/sandbox';
import { NO_CUSTOMIZATION } from '@/services/sandboxFactory';
import { SandboxClientError } from '@/services/types';
import {
  samplesActionCreators,
  selectSampleCreateError,
  selectSampleCreatePendingId,
  selectSamples,
  selectSamplesError,
  selectSamplesIsLoading,
} from '@/store/Samples';
import { createTestStore, TEST_NAMESPACE, testClient } from '@/testUtils';

const INDEX = [
  {
    id: 'hello-world',
    displayName: 'Hello World',
    description: 'The smallest possible Sandbox.',
    tags: ['Basic'],
    manifest: { filename: 'hello-world.yaml' },
  },
];

const MANIFEST = [
  'apiVersion: agents.x-k8s.io/v1beta1',
  'kind: Sandbox',
  'metadata:',
  '  name: sample-from-upstream',
  '  namespace: upstream-ns',
  'spec:',
  '  podTemplate:',
  '    spec:',
  '      containers:',
  '        - name: agent',
  '          image: busybox',
].join('\n');

const HELLO_WORLD: SandboxSample = {
  id: 'hello-world',
  displayName: 'Hello World',
  tags: [],
  filename: 'hello-world.yaml',
};

/** Serves the samples index and, for any .yaml, the sample manifest. */
function stubSampleRegistry(): void {
  global.fetch = jest.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('.json')) {
      return Promise.resolve({ ok: true, json: async () => INDEX });
    }
    return Promise.resolve({ ok: true, text: async () => MANIFEST });
  }) as unknown as typeof fetch;
}

function stubMissingRegistry(): void {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: false, status: 404 }),
  ) as unknown as typeof fetch;
}

const AI_REGISTRY = {
  providers: [{ id: 'anthropic', name: 'Anthropic' }],
  tools: [
    {
      providerId: 'anthropic',
      name: 'Claude Code',
      binary: 'claude',
      injectorImage: 'quay.io/example/claude-code:next',
    },
  ],
};

/** Serves the dashboard endpoints the AI catalogue is assembled from. */
function stubDashboardApi(replies: Record<string, unknown>): void {
  const http = axios.create({
    adapter: async (config: InternalAxiosRequestConfig) => {
      const data = replies[String(config.url)];
      const response: AxiosResponse = { status: 200, statusText: '', data, headers: {}, config };
      if (data === undefined) {
        throw new AxiosError('not served', '404', config, {}, { ...response, status: 404 });
      }
      return response;
    },
  });

  jest.spyOn(axios, 'create').mockReturnValue(http);
}

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe('the Samples slice', () => {
  it('reports loading until the index arrives', async () => {
    stubSampleRegistry();
    const store = createTestStore();
    expect(selectSamplesIsLoading(store.getState())).toBe(true);

    await store.dispatch(samplesActionCreators.requestSamples());

    expect(selectSamplesIsLoading(store.getState())).toBe(false);
    expect(selectSamples(store.getState())).toHaveLength(1);
    expect(selectSamples(store.getState())[0].displayName).toBe('Hello World');
  });

  it('records a missing index instead of leaving the page spinning', async () => {
    stubMissingRegistry();
    const store = createTestStore();

    await store.dispatch(samplesActionCreators.requestSamples());

    expect(selectSamplesIsLoading(store.getState())).toBe(false);
    expect(selectSamplesError(store.getState())?.statusCode).toBe(404);
  });

  it('creates the sample in the bootstrapped namespace', async () => {
    stubSampleRegistry();
    const client = testClient();
    const createSpy = jest.spyOn(client, 'createSandbox');
    const store = createTestStore({ client });

    const created = await store.dispatch(
      samplesActionCreators.createSandboxFromSample(HELLO_WORLD),
    );

    expect(created?.metadata.name).toBe('sample-from-upstream');
    expect(createSpy).toHaveBeenCalledWith(
      TEST_NAMESPACE,
      expect.objectContaining({
        metadata: expect.objectContaining({ namespace: TEST_NAMESPACE }),
      }),
    );
    expect(selectSampleCreatePendingId(store.getState())).toBeUndefined();
  });

  it('gives the sample a claim of its own when no storage is picked', async () => {
    stubSampleRegistry();
    const client = testClient();
    const createSpy = jest.spyOn(client, 'createSandbox');
    const store = createTestStore({ client });

    await store.dispatch(samplesActionCreators.createSandboxFromSample(HELLO_WORLD));

    const podSpec = createSpy.mock.calls[0][1].spec.podTemplate.spec;
    expect(podSpec.volumes).toEqual([
      {
        name: 'sandbox-storage',
        persistentVolumeClaim: { claimName: 'sandbox-sample-from-upstream' },
      },
    ]);
    expect(podSpec.containers[0].volumeMounts).toEqual([
      { name: 'sandbox-storage', mountPath: '/workspace' },
    ]);
  });

  it('creates the sample on temporary storage when that is what was picked', async () => {
    stubSampleRegistry();
    const client = testClient();
    const createSpy = jest.spyOn(client, 'createSandbox');
    const store = createTestStore({ client });

    await store.dispatch(
      samplesActionCreators.createSandboxFromSample(HELLO_WORLD, NO_CUSTOMIZATION, 'ephemeral'),
    );

    expect(createSpy.mock.calls[0][1].spec.podTemplate.spec.volumes).toEqual([
      { name: 'sandbox-storage', emptyDir: { sizeLimit: '5Gi' } },
    ]);
  });

  it('waits for the AI catalogue before it creates the sample', async () => {
    // The gallery is on screen before the catalogue answers, and the agents are
    // injected here and nowhere else: creating first would leave a sandbox
    // without the agent the user asked for.
    stubSampleRegistry();
    stubDashboardApi({ '/dashboard/api/ai-registry': AI_REGISTRY });
    const client = testClient();
    const createSpy = jest.spyOn(client, 'createSandbox');
    const store = createTestStore({ client });

    await store.dispatch(
      samplesActionCreators.createSandboxFromSample(HELLO_WORLD, { aiProviderIds: ['anthropic'] }),
    );

    const [, desired] = createSpy.mock.calls[0];
    expect(desired.spec.podTemplate.spec.initContainers).toEqual([
      expect.objectContaining({ name: 'claude-code-injector' }),
    ]);
  });

  it('creates the sample without an agent the cluster does not publish', async () => {
    stubSampleRegistry();
    stubDashboardApi({});
    const client = testClient();
    const createSpy = jest.spyOn(client, 'createSandbox');
    const store = createTestStore({ client });

    await store.dispatch(
      samplesActionCreators.createSandboxFromSample(HELLO_WORLD, { aiProviderIds: ['anthropic'] }),
    );

    expect(createSpy.mock.calls[0][1].spec.podTemplate.spec.initContainers).toBeUndefined();
  });

  it('keeps the published YAML so the Manifest tab can show it', async () => {
    stubSampleRegistry();
    const client = testClient();
    const createSpy = jest.spyOn(client, 'createSandbox');
    const store = createTestStore({ client });

    await store.dispatch(samplesActionCreators.createSandboxFromSample(HELLO_WORLD));

    expect(getSandboxOriginalManifest(createSpy.mock.calls[0][1])).toBe(MANIFEST);
  });

  it('opens the sandbox that is already there rather than reporting a clash', async () => {
    stubSampleRegistry();
    const client = testClient();
    const store = createTestStore({ client });
    await store.dispatch(samplesActionCreators.createSandboxFromSample(HELLO_WORLD));

    jest
      .spyOn(client, 'createSandbox')
      .mockRejectedValue(
        new SandboxClientError(409, 'sandboxes "sample-from-upstream" already exists'),
      );
    const getSpy = jest.spyOn(client, 'getSandbox');

    const created = await store.dispatch(
      samplesActionCreators.createSandboxFromSample(HELLO_WORLD),
    );

    expect(getSpy).toHaveBeenCalledWith(TEST_NAMESPACE, 'sample-from-upstream');
    expect(created).toBeDefined();
    expect(selectSampleCreateError(store.getState())).toBeUndefined();
  });

  it('resolves to undefined and records the error when the create fails', async () => {
    stubSampleRegistry();
    const client = testClient();
    jest
      .spyOn(client, 'createSandbox')
      .mockRejectedValue(new SandboxClientError(403, 'Forbidden.'));
    const store = createTestStore({ client });

    const created = await store.dispatch(
      samplesActionCreators.createSandboxFromSample(HELLO_WORLD),
    );

    expect(created).toBeUndefined();
    expect(selectSampleCreateError(store.getState())).toEqual({
      message: 'Forbidden.',
      statusCode: 403,
    });
  });

  it('reports a sample whose manifest was never downloaded', async () => {
    stubMissingRegistry();
    const store = createTestStore();

    const created = await store.dispatch(
      samplesActionCreators.createSandboxFromSample(HELLO_WORLD),
    );

    expect(created).toBeUndefined();
    expect(selectSampleCreateError(store.getState())?.message).toContain('yarn samples:prepare');
  });

  it('lets the user dismiss the create error', async () => {
    stubMissingRegistry();
    const store = createTestStore();
    await store.dispatch(samplesActionCreators.createSandboxFromSample(HELLO_WORLD));
    expect(selectSampleCreateError(store.getState())).toBeDefined();

    store.dispatch(samplesActionCreators.clearSampleCreateError());

    expect(selectSampleCreateError(store.getState())).toBeUndefined();
  });

  it('keeps the loaded samples when a refresh fails', async () => {
    stubSampleRegistry();
    const store = createTestStore();
    await store.dispatch(samplesActionCreators.requestSamples());

    stubMissingRegistry();
    await store.dispatch(samplesActionCreators.requestSamples());

    expect(selectSamples(store.getState())).toHaveLength(1);
    expect(selectSamplesError(store.getState())).toBeDefined();
  });
});
