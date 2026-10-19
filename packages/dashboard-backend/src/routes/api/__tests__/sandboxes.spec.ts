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

  beforeEach(() => {
    mockState.agentSandboxEnabled = true;
    mockState.lastSandboxPatch = undefined;
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
});
