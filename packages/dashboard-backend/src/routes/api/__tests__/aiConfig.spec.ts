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
import { stubAiProviderKeyIds } from '@/routes/api/helpers/__mocks__/getDevWorkspaceClient';
import { setup, teardown } from '@/utils/appBuilder';

jest.mock('../helpers/getToken.ts');
jest.mock('../helpers/getDevWorkspaceClient.ts');
jest.mock('../helpers/getServiceAccountToken.ts');

describe('AI Config Routes', () => {
  let app: FastifyInstance;
  const namespace = 'user-che';

  beforeEach(async () => {
    app = await setup();
  });

  afterEach(() => {
    teardown(app);
    jest.clearAllMocks();
  });

  describe('GET /api/namespace/:namespace/ai-provider-key', () => {
    it('should return 200 with provider IDs', async () => {
      const res = await app.inject().get(`${baseApiPath}/namespace/${namespace}/ai-provider-key`);

      expect(res.statusCode).toEqual(200);
      expect(res.json()).toEqual(stubAiProviderKeyIds);
    });
  });

  describe('POST /api/namespace/:namespace/ai-provider-key', () => {
    it('should return 200 with the toolId when tool is found in server config', async () => {
      const body = { toolId: 'gemini-cli', apiKey: 'AIzaSy12345' };
      const res = await app
        .inject()
        .post(`${baseApiPath}/namespace/${namespace}/ai-provider-key`)
        .payload(body);

      expect(res.statusCode).toEqual(200);
      expect(res.json()).toEqual({ toolId: 'gemini-cli' });
    });

    it('should return 404 when provider is not found in server config', async () => {
      const body = { toolId: 'unknown-tool', apiKey: 'some-key' };
      const res = await app
        .inject()
        .post(`${baseApiPath}/namespace/${namespace}/ai-provider-key`)
        .payload(body);

      expect(res.statusCode).toEqual(404);
    });

    it('should return 400 when body is invalid', async () => {
      const res = await app
        .inject()
        .post(`${baseApiPath}/namespace/${namespace}/ai-provider-key`)
        .payload({ toolId: 'gemini-cli' }); // missing apiKey

      expect(res.statusCode).toEqual(400);
    });
  });

  describe('DELETE /api/namespace/:namespace/ai-provider-key/:toolId', () => {
    it('should return 204 on success', async () => {
      const toolId = 'gemini-cli';
      const res = await app
        .inject()
        .delete(`${baseApiPath}/namespace/${namespace}/ai-provider-key/${toolId}`);

      expect(res.statusCode).toEqual(204);
    });
  });
});
