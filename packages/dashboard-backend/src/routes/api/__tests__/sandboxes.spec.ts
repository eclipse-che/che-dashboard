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
import { stubSandbox, stubSandboxList } from '@/routes/api/helpers/__mocks__/getDevWorkspaceClient';
import { mockState } from '@/routes/api/helpers/__mocks__/mockState';
import { setup, teardown } from '@/utils/appBuilder';

jest.mock('../helpers/getDevWorkspaceClient.ts');
jest.mock('../helpers/getServiceAccountToken.ts');
jest.mock('../helpers/getToken.ts');

describe('Sandboxes Routes', () => {
  let app: FastifyInstance;
  const namespace = 'user-che';
  const sandboxName = 'hello-world';

  beforeAll(async () => {
    app = await setup();
  });

  /** What the browser sends for the per-sandbox storage type. */
  const claimSpec = {
    podTemplate: {
      spec: {
        containers: [{ name: 'agent', image: 'busybox' }],
        volumes: [
          {
            name: 'sandbox-storage',
            persistentVolumeClaim: { claimName: `sandbox-${sandboxName}` },
          },
        ],
      },
    },
  };

  /** And for the ephemeral one. */
  const emptyDirSpec = {
    podTemplate: {
      spec: {
        containers: [{ name: 'agent', image: 'busybox' }],
        volumes: [{ name: 'sandbox-storage', emptyDir: { sizeLimit: '5Gi' } }],
      },
    },
  };

  beforeEach(() => {
    mockState.agentSandboxEnabled = true;
    mockState.lastSandboxPatch = undefined;
    mockState.sandboxCreateFails = false;
    mockState.sandboxClaimCreated = true;
    mockState.sandboxStorageCalls = [];
  });

  afterAll(() => {
    teardown(app);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('GET ${baseApiPath}/sandboxes/available', async () => {
    const res = await app.inject().get(`${baseApiPath}/sandboxes/available`);

    expect(res.statusCode).toEqual(200);
    expect(res.json()).toEqual({ available: true });
  });

  test('GET ${baseApiPath}/sandboxes/available reports false when the admin disabled it', async () => {
    mockState.agentSandboxEnabled = false;

    const res = await app.inject().get(`${baseApiPath}/sandboxes/available`);

    // The bundle ships in every image, so hiding the masthead button is not a
    // feature switch on its own: the probe has to answer for the feature.
    expect(res.statusCode).toEqual(200);
    expect(res.json()).toEqual({ available: false });
  });

  test('GET ${baseApiPath}/namespace/:namespace/sandboxes', async () => {
    const res = await app.inject().get(`${baseApiPath}/namespace/${namespace}/sandboxes`);

    expect(res.statusCode).toEqual(200);
    expect(res.json()).toEqual(stubSandboxList);
  });

  test('GET ${baseApiPath}/namespace/:namespace/sandboxes/:sandboxName', async () => {
    const res = await app
      .inject()
      .get(`${baseApiPath}/namespace/${namespace}/sandboxes/${sandboxName}`);

    expect(res.statusCode).toEqual(200);
    expect(res.json()).toEqual(stubSandbox);
  });

  test('POST ${baseApiPath}/namespace/:namespace/sandboxes', async () => {
    const res = await app
      .inject()
      .post(`${baseApiPath}/namespace/${namespace}/sandboxes`)
      .payload({ metadata: { name: sandboxName }, spec: {} });

    expect(res.statusCode).toEqual(200);
    expect(res.json()).toEqual(stubSandbox);
  });

  test('POST creates the sandbox as the browser described it', async () => {
    const res = await app
      .inject()
      .post(`${baseApiPath}/namespace/${namespace}/sandboxes`)
      .payload({ metadata: { name: sandboxName }, spec: {} });

    expect(res.statusCode).toEqual(200);
    expect(res.json()).toEqual(stubSandbox);
    expect(mockState.lastSandboxPatch).toBeUndefined();
  });

  test('POST rejects a body without metadata', async () => {
    const res = await app
      .inject()
      .post(`${baseApiPath}/namespace/${namespace}/sandboxes`)
      .payload({ spec: {} });

    expect(res.statusCode).toEqual(400);
  });

  test('PATCH ${baseApiPath}/namespace/:namespace/sandboxes/:sandboxName', async () => {
    const res = await app
      .inject()
      .patch(`${baseApiPath}/namespace/${namespace}/sandboxes/${sandboxName}`)
      .headers({ 'content-type': 'application/merge-patch+json' })
      .payload({ spec: { shutdown: true } });

    expect(res.statusCode).toEqual(200);
    expect(res.json()).toEqual(stubSandbox);
  });

  test('DELETE ${baseApiPath}/namespace/:namespace/sandboxes/:sandboxName', async () => {
    const res = await app
      .inject()
      .delete(`${baseApiPath}/namespace/${namespace}/sandboxes/${sandboxName}`);

    expect(res.statusCode).toEqual(204);
  });

  describe('the storage a sandbox asks for', () => {
    test('POST provisions the claim before the sandbox that mounts it', async () => {
      const res = await app
        .inject()
        .post(`${baseApiPath}/namespace/${namespace}/sandboxes`)
        .payload({ metadata: { name: sandboxName }, spec: claimSpec });

      expect(res.statusCode).toEqual(200);
      // A pod referencing a claim that is not there never schedules, and
      // nothing afterwards would retry it.
      expect(mockState.sandboxStorageCalls).toEqual([
        `ensure:sandbox-${sandboxName}`,
        `adopt:${sandboxName}`,
      ]);
    });

    test('POST provisions nothing for an ephemeral sandbox', async () => {
      const res = await app
        .inject()
        .post(`${baseApiPath}/namespace/${namespace}/sandboxes`)
        .payload({ metadata: { name: sandboxName }, spec: emptyDirSpec });

      expect(res.statusCode).toEqual(200);
      expect(mockState.sandboxStorageCalls).toEqual([]);
    });

    test('POST leaves a claim the user manages alone', async () => {
      const res = await app
        .inject()
        .post(`${baseApiPath}/namespace/${namespace}/sandboxes`)
        .payload({
          metadata: { name: sandboxName },
          spec: {
            podTemplate: {
              spec: {
                containers: [],
                volumes: [
                  { name: 'sandbox-storage', persistentVolumeClaim: { claimName: 'my-own' } },
                ],
              },
            },
          },
        });

      expect(res.statusCode).toEqual(200);
      expect(mockState.sandboxStorageCalls).toEqual([]);
    });

    test('POST takes back a claim it made for a sandbox that was refused', async () => {
      mockState.sandboxCreateFails = true;

      const res = await app
        .inject()
        .post(`${baseApiPath}/namespace/${namespace}/sandboxes`)
        .payload({ metadata: { name: sandboxName }, spec: claimSpec });

      expect(res.statusCode).toEqual(500);
      expect(mockState.sandboxStorageCalls).toEqual([
        `ensure:sandbox-${sandboxName}`,
        `delete:${sandboxName}`,
      ]);
    });

    test('POST keeps a claim that was already there when creation failed', async () => {
      mockState.sandboxCreateFails = true;
      mockState.sandboxClaimCreated = false;

      const res = await app
        .inject()
        .post(`${baseApiPath}/namespace/${namespace}/sandboxes`)
        .payload({ metadata: { name: sandboxName }, spec: claimSpec });

      expect(res.statusCode).toEqual(500);
      // The likeliest reason creation failed is a sandbox of that name, whose
      // data the rollback would otherwise destroy.
      expect(mockState.sandboxStorageCalls).toEqual([`ensure:sandbox-${sandboxName}`]);
    });

    test('PATCH provisions the claim before the pod template points at it', async () => {
      const res = await app
        .inject()
        .patch(`${baseApiPath}/namespace/${namespace}/sandboxes/${sandboxName}`)
        .headers({ 'content-type': 'application/merge-patch+json' })
        .payload({ spec: claimSpec });

      expect(res.statusCode).toEqual(200);
      expect(mockState.sandboxStorageCalls).toEqual([
        `ensure:sandbox-${sandboxName}`,
        `adopt:${sandboxName}`,
      ]);
    });

    test('PATCH removes the claim only once nothing refers to it', async () => {
      const res = await app
        .inject()
        .patch(`${baseApiPath}/namespace/${namespace}/sandboxes/${sandboxName}`)
        .headers({ 'content-type': 'application/merge-patch+json' })
        .payload({ spec: emptyDirSpec });

      expect(res.statusCode).toEqual(200);
      expect(mockState.sandboxStorageCalls).toEqual([`delete:${sandboxName}`]);
    });

    test('PATCH of a lifecycle action touches no storage', async () => {
      const res = await app
        .inject()
        .patch(`${baseApiPath}/namespace/${namespace}/sandboxes/${sandboxName}`)
        .headers({ 'content-type': 'application/merge-patch+json' })
        .payload({ spec: { operatingMode: 'Suspended' } });

      expect(res.statusCode).toEqual(200);
      // A suspend says nothing about the pod template, so the claim of a
      // sandbox that has one must survive it.
      expect(mockState.sandboxStorageCalls).toEqual([]);
    });

    test('DELETE removes the claim of a sandbox that never adopted one', async () => {
      const res = await app
        .inject()
        .delete(`${baseApiPath}/namespace/${namespace}/sandboxes/${sandboxName}`);

      expect(res.statusCode).toEqual(204);
      expect(mockState.sandboxStorageCalls).toEqual([`delete:${sandboxName}`]);
    });
  });
});
