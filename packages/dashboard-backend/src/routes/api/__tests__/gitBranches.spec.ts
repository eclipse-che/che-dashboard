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

// eslint-disable-next-line prefer-const
let mockRunImpl: () => unknown = () => undefined;

jest.mock('../helpers/getDevWorkspaceClient.ts');
jest.mock('../helpers/getServiceAccountToken.ts');
jest.mock('@/devworkspaceClient/services/helpers/exec', () => ({
  run: () => mockRunImpl(),
}));

describe('GitBranches Route', () => {
  let app: FastifyInstance;
  const url = 'https://github.com/username/repository.git';

  beforeEach(async () => {
    app = await setup();
    // Simulate a minimal git ls-remote output line so getBranches returns branches
    mockRunImpl = () => 'abc123\trefs/heads/main';
  });

  afterEach(() => {
    teardown(app);
  });

  test('POST ${baseApiPath}/gitbranches - success', async () => {
    const res = await app.inject().post(`${baseApiPath}/gitbranches`).payload({ url });

    expect(res.statusCode).toEqual(200);
  });

  test('POST ${baseApiPath}/gitbranches - returns 400 on invalid URL', async () => {
    const res = await app
      .inject()
      .post(`${baseApiPath}/gitbranches`)
      .payload({ url: 'not-a-valid-url' });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toContain('Invalid repository url');
  });

  test('POST ${baseApiPath}/gitbranches - returns 500 when git ls-remote fails', async () => {
    mockRunImpl = () => {
      throw new Error("Command 'git' was killed by signal SIGTERM (timeout?)");
    };

    const res = await app.inject().post(`${baseApiPath}/gitbranches`).payload({ url });

    expect(res.statusCode).toEqual(500);
  });
});
