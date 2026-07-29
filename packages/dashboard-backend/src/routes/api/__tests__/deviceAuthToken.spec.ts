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
import { setup, teardown } from '@/utils/appBuilder';

jest.mock('../helpers/getServiceAccountToken.ts');
jest.mock('../helpers/getDevWorkspaceClient.ts');

let mockClientId: string | null = null;
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

  describe('POST /initiate — device auth not configured', () => {
    it('returns 503 when device-auth-config ConfigMap is absent', async () => {
      mockClientId = null;
      const res = await app.inject({
        method: 'POST',
        url: `${baseApiPath}/namespace/${namespace}/device-auth-token/initiate`,
      });
      expect(res.statusCode).toBe(503);
    });
  });

  describe('POST /initiate — device auth configured', () => {
    it('does not return 503 when clientId is present', async () => {
      mockClientId = 'test-client-id';
      const res = await app.inject({
        method: 'POST',
        url: `${baseApiPath}/namespace/${namespace}/device-auth-token/initiate`,
      });
      expect(res.statusCode).not.toBe(503);
    });
  });

  describe('POST /poll — device auth not configured', () => {
    it('returns 503 when device-auth-config ConfigMap is absent', async () => {
      mockClientId = null;
      const res = await app.inject({
        method: 'POST',
        url: `${baseApiPath}/namespace/${namespace}/device-auth-token/poll`,
        payload: { deviceCode: 'ABCD-1234' },
      });
      expect(res.statusCode).toBe(503);
    });
  });

  describe('POST /poll — device auth configured', () => {
    it('does not return 503 when clientId is present', async () => {
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
