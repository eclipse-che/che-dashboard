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
import { getDevWorkspaceClient } from '@/routes/api/helpers/getDevWorkspaceClient';
import {
  stubAiRegistry,
  stubDevWorkspace,
  stubDevWorkspaceTemplate,
  stubHeaders,
} from '@/routes/api/helpers/__mocks__/getDevWorkspaceClient';
import { setup, teardown } from '@/utils/appBuilder';
import * as getTokenHelper from '../helpers/getToken';

const mockGenerateDevfileContext = jest.fn().mockResolvedValue({
  devWorkspace: {
    apiVersion: 'workspace.devfile.io/v1alpha2',
    kind: 'DevWorkspace',
    metadata: { name: 'test-wksp' },
    spec: { started: false, template: {} },
  },
  devWorkspaceTemplates: [],
});

jest.mock('@eclipse-che/che-devworkspace-generator/lib/main', () => ({
  Main: jest.fn().mockImplementation(() => ({
    generateDevfileContext: mockGenerateDevfileContext,
  })),
}));
jest.mock('../helpers/getDevWorkspaceClient.ts');
jest.mock('../helpers/getToken.ts');
jest.mock('../helpers/getServiceAccountToken.ts');
jest.mock('@/routes/api/helpers/getCertificateAuthority', () => ({
  axiosInstance: { get: jest.fn(), post: jest.fn() },
  axiosInstanceNoCert: { get: jest.fn(), post: jest.fn() },
}));

describe('Workspace Creation Route', () => {
  let app: FastifyInstance;
  const namespace = 'user-che';

  beforeAll(async () => {
    app = await setup({ env: { CHE_HOST: 'localhost' } });
  });

  afterAll(() => {
    teardown(app);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('POST with devfileContent returns 200 and created workspace', async () => {
    const res = await app
      .inject()
      .post(`${baseApiPath}/namespace/${namespace}/workspace-creation`)
      .payload({ devfileContent: 'schemaVersion: 2.2.0\nmetadata:\n  name: test' });

    expect(res.statusCode).toEqual(200);
    expect(res.json()).toEqual(stubDevWorkspace);
  });

  test('POST with devfileUrl returns 200 and created workspace', async () => {
    const res = await app
      .inject()
      .post(`${baseApiPath}/namespace/${namespace}/workspace-creation`)
      .payload({ devfileUrl: 'https://example.com/devfile.yaml' });

    expect(res.statusCode).toEqual(200);
    expect(res.json()).toEqual(stubDevWorkspace);
  });

  test('POST returns 400 when neither devfileContent nor devfileUrl provided', async () => {
    const res = await app
      .inject()
      .post(`${baseApiPath}/namespace/${namespace}/workspace-creation`)
      .payload({});

    expect(res.statusCode).toEqual(400);
    expect(res.json()).toMatchObject({
      message: 'Either devfileContent or devfileUrl must be provided',
    });
  });

  test('POST returns 400 when both devfileContent and devfileUrl provided', async () => {
    const res = await app
      .inject()
      .post(`${baseApiPath}/namespace/${namespace}/workspace-creation`)
      .payload({
        devfileContent: 'schemaVersion: 2.2.0',
        devfileUrl: 'https://example.com/devfile.yaml',
      });

    expect(res.statusCode).toEqual(400);
    expect(res.json()).toMatchObject({
      message: 'Provide either devfileContent or devfileUrl, not both',
    });
  });

  test('POST returns 401 when authorization token is missing', async () => {
    const spy = jest.spyOn(getTokenHelper, 'getToken').mockImplementationOnce(() => {
      const err: any = new Error('Bearer Token Authorization is required');
      err.statusCode = 401;
      throw err;
    });

    try {
      const res = await app
        .inject()
        .post(`${baseApiPath}/namespace/${namespace}/workspace-creation`)
        .payload({ devfileContent: 'schemaVersion: 2.2.0' });

      expect(res.statusCode).toEqual(401);
    } finally {
      spy.mockRestore();
    }
  });

  test('POST returns 500 when devworkspace generator throws', async () => {
    mockGenerateDevfileContext.mockRejectedValueOnce(new Error('Generator failed'));

    const res = await app
      .inject()
      .post(`${baseApiPath}/namespace/${namespace}/workspace-creation`)
      .payload({ devfileContent: 'schemaVersion: 2.2.0' });

    expect(res.statusCode).toEqual(500);
  });

  test('POST skips template creation when devWorkspaceTemplates is empty', async () => {
    mockGenerateDevfileContext.mockResolvedValueOnce({
      devWorkspace: {
        apiVersion: 'workspace.devfile.io/v1alpha2',
        kind: 'DevWorkspace',
        metadata: { name: 'test-wksp' },
        spec: { started: false, template: {} },
      },
      devWorkspaceTemplates: [],
    });

    const res = await app
      .inject()
      .post(`${baseApiPath}/namespace/${namespace}/workspace-creation`)
      .payload({ devfileContent: 'schemaVersion: 2.2.0' });

    expect(res.statusCode).toEqual(200);
    expect(res.json()).toEqual(stubDevWorkspace);
  });

  test('POST creates templates when devWorkspaceTemplates is non-empty', async () => {
    mockGenerateDevfileContext.mockResolvedValueOnce({
      devWorkspace: {
        apiVersion: 'workspace.devfile.io/v1alpha2',
        kind: 'DevWorkspace',
        metadata: { name: 'test-wksp' },
        spec: { started: false, template: {} },
      },
      devWorkspaceTemplates: [stubDevWorkspaceTemplate],
    });

    const res = await app
      .inject()
      .post(`${baseApiPath}/namespace/${namespace}/workspace-creation`)
      .payload({ devfileContent: 'schemaVersion: 2.2.0' });

    expect(res.statusCode).toEqual(200);
    expect(res.json()).toEqual(stubDevWorkspace);
  });

  test('POST SCC patch failure is non-fatal and returns HTTP 200', async () => {
    (getDevWorkspaceClient as jest.Mock).mockImplementation(() => ({
      serverConfigApi: {
        fetchCheCustomResource: () => Promise.resolve({}),
        getContainerBuild: () => ({
          containerBuildConfiguration: {
            openShiftSecurityContextConstraint: 'restricted-v2',
          },
        }),
      },
      devworkspaceApi: {
        create: () => Promise.resolve({ devWorkspace: stubDevWorkspace, headers: stubHeaders }),
        patch: () => Promise.reject(new Error('SCC patch failed')),
      },
      devWorkspaceTemplateApi: {
        create: () => Promise.resolve(stubDevWorkspaceTemplate),
      },
      aiRegistryApi: {
        get: () => Promise.resolve(stubAiRegistry),
      },
    }));

    const res = await app
      .inject()
      .post(`${baseApiPath}/namespace/${namespace}/workspace-creation`)
      .payload({ devfileContent: 'schemaVersion: 2.2.0' });

    expect(res.statusCode).toEqual(200);
    expect(res.json()).toEqual(stubDevWorkspace);
  });

  test('POST calls AI registry when aiProviders are requested', async () => {
    (getDevWorkspaceClient as jest.Mock).mockImplementation(() => ({
      serverConfigApi: {
        fetchCheCustomResource: () => Promise.resolve({}),
        getContainerBuild: () => ({}),
      },
      devworkspaceApi: {
        create: () => Promise.resolve({ devWorkspace: stubDevWorkspace, headers: stubHeaders }),
        patch: () => Promise.resolve({ devWorkspace: stubDevWorkspace, headers: stubHeaders }),
      },
      devWorkspaceTemplateApi: {
        create: () => Promise.resolve(stubDevWorkspaceTemplate),
      },
      aiRegistryApi: {
        get: () => Promise.resolve(stubAiRegistry),
      },
    }));

    const res = await app
      .inject()
      .post(`${baseApiPath}/namespace/${namespace}/workspace-creation`)
      .payload({
        devfileContent: 'schemaVersion: 2.2.0',
        aiProviders: ['google/gemini'],
      });

    expect(res.statusCode).toEqual(200);
    // With aiProviders in the body, getDevWorkspaceClient is called twice:
    // once for the AI registry lookup and once for workspace creation
    expect(getDevWorkspaceClient).toHaveBeenCalledTimes(2);
  });
});
