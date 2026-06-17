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
import { DevWorkspaceClient } from '@/devworkspaceClient';
import { getDevWorkspaceClient } from '@/routes/api/helpers/getDevWorkspaceClient';
import { setup, teardown } from '@/utils/appBuilder';

jest.mock('../helpers/getToken.ts');
jest.mock('../helpers/getDevWorkspaceClient.ts');
jest.mock('../helpers/getServiceAccountToken.ts');

describe('SCC Permission Route', () => {
  let app: FastifyInstance;
  const namespace = 'user-che';
  const scc = 'container-build';

  beforeAll(async () => {
    app = await setup();
  });

  afterAll(() => {
    teardown(app);
    jest.clearAllMocks();
  });

  test(`GET ${baseApiPath}/namespace/:namespace/scc-permission/:scc - permitted`, async () => {
    const res = await app
      .inject()
      .get(`${baseApiPath}/namespace/${namespace}/scc-permission/${scc}`);

    expect(res.statusCode).toEqual(200);
    expect(res.json()).toEqual({ permitted: true });
  });

  test(`GET ${baseApiPath}/namespace/:namespace/scc-permission/:scc - denied`, async () => {
    (getDevWorkspaceClient as jest.Mock).mockImplementationOnce(() => {
      return {
        sccPermissionApi: {
          checkSccPermission: () => Promise.resolve(false),
        },
      } as unknown as DevWorkspaceClient;
    });

    const res = await app
      .inject()
      .get(`${baseApiPath}/namespace/${namespace}/scc-permission/${scc}`);

    expect(res.statusCode).toEqual(200);
    expect(res.json()).toEqual({ permitted: false });
  });

  test(`GET ${baseApiPath}/namespace/:namespace/scc-permission/:scc - API error`, async () => {
    (getDevWorkspaceClient as jest.Mock).mockImplementationOnce(() => {
      return {
        sccPermissionApi: {
          checkSccPermission: () => Promise.reject(new Error('K8s API unreachable')),
        },
      } as unknown as DevWorkspaceClient;
    });

    const res = await app
      .inject()
      .get(`${baseApiPath}/namespace/${namespace}/scc-permission/${scc}`);

    expect(res.statusCode).toEqual(500);
  });
});
