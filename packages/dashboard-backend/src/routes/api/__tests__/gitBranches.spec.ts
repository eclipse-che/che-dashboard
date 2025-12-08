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

jest.mock('../helpers/getDevWorkspaceClient.ts');
jest.mock('../helpers/getServiceAccountToken.ts');
jest.mock('@/devworkspaceClient/services/helpers/exec', () => {
  return {
    run: () => undefined,
  };
});

describe('GitBranches Route', () => {
  let app: FastifyInstance;
  const url = encodeURIComponent('https://github.com/username/repository.git');

  beforeEach(async () => {
    app = await setup();
  });

  afterEach(() => {
    teardown(app);
  });

  test('GET ${baseApiPath}/gitbranches:url', async () => {
    const res = await app.inject().get(`${baseApiPath}/gitbranches/${url}`);

    expect(res.statusCode).toEqual(200);
  });
});
