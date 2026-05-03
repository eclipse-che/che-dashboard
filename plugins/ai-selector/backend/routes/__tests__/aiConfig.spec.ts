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

jest.mock('@/routes/api/helpers/getToken.ts');
jest.mock('@/routes/api/helpers/getDevWorkspaceClient.ts');
jest.mock('@/routes/api/helpers/getServiceAccountToken.ts');

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
    it('should return 201 with the toolId', async () => {
      const body = { toolId: 'google/gemini', envVarName: 'GEMINI_API_KEY', apiKey: 'AIzaSy12345' };
      const res = await app
        .inject()
        .post(`${baseApiPath}/namespace/${namespace}/ai-provider-key`)
        .payload(body);

      expect(res.statusCode).toEqual(201);
      expect(res.json()).toEqual({ toolId: 'google/gemini' });
    });

    it('should return 400 when envVarName is missing', async () => {
      const res = await app
        .inject()
        .post(`${baseApiPath}/namespace/${namespace}/ai-provider-key`)
        .payload({ toolId: 'google/gemini', apiKey: 'AIzaSy12345' }); // missing envVarName

      expect(res.statusCode).toEqual(400);
    });

    it('should return 400 when apiKey is missing', async () => {
      const res = await app
        .inject()
        .post(`${baseApiPath}/namespace/${namespace}/ai-provider-key`)
        .payload({ toolId: 'google/gemini', envVarName: 'GEMINI_API_KEY' }); // missing apiKey

      expect(res.statusCode).toEqual(400);
    });
  });

  describe('DELETE /api/namespace/:namespace/ai-provider-key/:toolId', () => {
    it('should return 204 on success', async () => {
      const toolId = 'google/gemini';
      const res = await app
        .inject()
        .delete(
          `${baseApiPath}/namespace/${namespace}/ai-provider-key/${encodeURIComponent(toolId)}`,
        );

      expect(res.statusCode).toEqual(204);
    });
  });
});
