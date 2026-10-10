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

import { setup, teardown } from '@/utils/appBuilder';

jest.mock('@/routes/api/helpers/getDevWorkspaceClient.ts');
jest.mock('@/routes/api/helpers/getServiceAccountToken.ts');

describe('Workspace Redirect', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await setup({ env: { CHE_DASHBOARD_REDIRECT_URL: 'https://alternative.example.com' } });
  });

  afterAll(() => {
    teardown(app);
  });

  it('should redirect /w with params to /dashboard/#/ide/:namespace/:workspace', async () => {
    const params = JSON.stringify({ namespace: 'user1-che', workspace: 'my-workspace' });
    const res = await app.inject({
      method: 'GET',
      url: `/w?params=${encodeURIComponent(params)}`,
    });

    expect(res.statusCode).toEqual(302);
    expect(res.headers.location).toEqual('/dashboard/#/ide/user1-che/my-workspace');
  });

  it('should redirect /dashboard/w with params to /dashboard/#/ide/:namespace/:workspace', async () => {
    const params = JSON.stringify({ namespace: 'user1-che', workspace: 'my-workspace' });
    const res = await app.inject({
      method: 'GET',
      url: `/dashboard/w?params=${encodeURIComponent(params)}`,
    });

    expect(res.statusCode).toEqual(302);
    expect(res.headers.location).toEqual('/dashboard/#/ide/user1-che/my-workspace');
  });
});
