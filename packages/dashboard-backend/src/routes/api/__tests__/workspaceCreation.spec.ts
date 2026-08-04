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
  stubDevWorkspace,
  stubDevWorkspaceTemplate,
} from '@/routes/api/helpers/__mocks__/getDevWorkspaceClient';
import { setup, teardown } from '@/utils/appBuilder';

jest.mock('../helpers/getDevWorkspaceClient.ts');
jest.mock('../helpers/getToken.ts');
jest.mock('../helpers/getServiceAccountToken.ts');

describe('WorkspaceCreation Route', () => {
  let app: FastifyInstance;
  const namespace = 'user-che';

  describe('POST /namespace/:namespace/workspace-creation', () => {
    beforeAll(async () => {
      app = await setup({});
    });

    afterAll(() => {
      teardown(app);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should return 200 and the created DevWorkspace on success with devfileContent', async () => {
      const res = await app
        .inject()
        .post(`${baseApiPath}/namespace/${namespace}/workspace-creation`)
        .payload({ devfileContent: 'schemaVersion: 2.2.0\nmetadata:\n  name: my-workspace\n' });

      expect(res.statusCode).toEqual(200);
      const body = res.json();
      expect(body).toEqual(stubDevWorkspace);
    });

    it('should return 200 with editorContent included in the request', async () => {
      const res = await app
        .inject()
        .post(`${baseApiPath}/namespace/${namespace}/workspace-creation`)
        .payload({
          devfileContent: 'schemaVersion: 2.2.0\nmetadata:\n  name: my-workspace\n',
          editorContent: 'schemaVersion: 2.2.0\nmetadata:\n  name: che-code\n',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.json()).toEqual(stubDevWorkspace);
    });

    it('should return 200 with editorPath specified instead of editorContent', async () => {
      const res = await app
        .inject()
        .post(`${baseApiPath}/namespace/${namespace}/workspace-creation`)
        .payload({
          devfileContent: 'schemaVersion: 2.2.0\nmetadata:\n  name: my-workspace\n',
          editorPath: 'che-incubator/che-code/latest',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.json()).toEqual(stubDevWorkspace);
    });

    it('should return 200 with gitBranch and remoteUrl specified', async () => {
      const res = await app
        .inject()
        .post(`${baseApiPath}/namespace/${namespace}/workspace-creation`)
        .payload({
          devfileContent: 'schemaVersion: 2.2.0\nmetadata:\n  name: my-workspace\n',
          remoteUrl: 'https://github.com/eclipse-che/che-dashboard',
          gitBranch: 'main',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.json()).toEqual(stubDevWorkspace);
    });

    it('should return 200 with an empty body (all fields optional)', async () => {
      const res = await app
        .inject()
        .post(`${baseApiPath}/namespace/${namespace}/workspace-creation`)
        .payload({});

      expect(res.statusCode).toEqual(200);
    });

    it('should return 400 when body contains a field with an invalid type (non-string devfileContent)', async () => {
      const res = await app
        .inject()
        .post(`${baseApiPath}/namespace/${namespace}/workspace-creation`)
        .payload({ devfileContent: 12345 });

      expect(res.statusCode).toEqual(400);
    });

    it('should return 400 when body contains an invalid type for editorContent', async () => {
      const res = await app
        .inject()
        .post(`${baseApiPath}/namespace/${namespace}/workspace-creation`)
        .payload({ editorContent: true });

      expect(res.statusCode).toEqual(400);
    });

    it('should return 409 when the workspace already exists (conflict)', async () => {
      const { getDevWorkspaceClient } = jest.requireMock('../helpers/getDevWorkspaceClient.ts');
      getDevWorkspaceClient.mockReturnValueOnce({
        devworkspaceApi: {
          create: jest.fn().mockRejectedValue(
            Object.assign(new Error('AlreadyExists'), { statusCode: 409 }),
          ),
        },
        devWorkspaceTemplateApi: {
          create: jest.fn().mockResolvedValue(stubDevWorkspaceTemplate),
        },
      });

      const res = await app
        .inject()
        .post(`${baseApiPath}/namespace/${namespace}/workspace-creation`)
        .payload({ devfileContent: 'schemaVersion: 2.2.0\nmetadata:\n  name: existing-ws\n' });

      expect(res.statusCode).toEqual(409);
    });

    it('should create the DevWorkspaceTemplate before creating the DevWorkspace (template creation order)', async () => {
      const callOrder: string[] = [];
      const mockCreateTemplate = jest.fn().mockImplementation(() => {
        callOrder.push('createTemplate');
        return Promise.resolve(stubDevWorkspaceTemplate);
      });
      const mockCreateWorkspace = jest.fn().mockImplementation(() => {
        callOrder.push('createWorkspace');
        return Promise.resolve({ devWorkspace: stubDevWorkspace, headers: {} });
      });

      const { getDevWorkspaceClient } = jest.requireMock('../helpers/getDevWorkspaceClient.ts');
      getDevWorkspaceClient.mockReturnValueOnce({
        devworkspaceApi: {
          create: mockCreateWorkspace,
        },
        devWorkspaceTemplateApi: {
          create: mockCreateTemplate,
        },
      });

      const res = await app
        .inject()
        .post(`${baseApiPath}/namespace/${namespace}/workspace-creation`)
        .payload({
          devfileContent: 'schemaVersion: 2.2.0\nmetadata:\n  name: ordered-ws\n',
          editorContent: 'schemaVersion: 2.2.0\nmetadata:\n  name: che-code\n',
        });

      expect(res.statusCode).toEqual(200);
      expect(callOrder.indexOf('createTemplate')).toBeLessThan(
        callOrder.indexOf('createWorkspace'),
      );
    });

    it('should pass namespace from the URL to the DevWorkspace client', async () => {
      const { getDevWorkspaceClient } = jest.requireMock('../helpers/getDevWorkspaceClient.ts');
      const mockCreate = jest.fn().mockResolvedValue({
        devWorkspace: stubDevWorkspace,
        headers: {},
      });
      getDevWorkspaceClient.mockReturnValueOnce({
        devworkspaceApi: { create: mockCreate },
        devWorkspaceTemplateApi: {
          create: jest.fn().mockResolvedValue(stubDevWorkspaceTemplate),
        },
      });

      const targetNamespace = 'my-custom-namespace';
      await app
        .inject()
        .post(`${baseApiPath}/namespace/${targetNamespace}/workspace-creation`)
        .payload({ devfileContent: 'schemaVersion: 2.2.0\nmetadata:\n  name: ns-ws\n' });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.anything(),
        targetNamespace,
        expect.anything(),
      );
    });
  });
});
