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
const response =
  'c9440b0ca811e5d8e7abeee8467e1219d5ca4cb6\trefs/heads/master ' +
  '0fa45f3539ca69615d0ccd8e0277fb7f12ee7715\trefs/heads/new/branch ' +
  '42c6289f142a5589f206425d812d0b125ab87990\trefs/heads/newBranch ' +
  '0e647bc78ac310d96251d581e5498b1503729e87\trefs/tags/test ' +
  'fb3a99a405876f16e2dcb231a061d5a3f735b2aa\trefs/pull/809/head';
jest.mock('@/devworkspaceClient/services/helpers/exec', () => {
  return {
    run: async () => response,
  };
});

describe('GitBranches Route', () => {
  let app: FastifyInstance;
  const url = 'url';

  beforeEach(async () => {
    app = await setup();
  });

  afterEach(() => {
    teardown(app);
  });

  test('GET ${baseApiPath}/gitbranches:url', async () => {
    const res = await app.inject().get(`${baseApiPath}/gitbranches/${url}`);

    expect(res.statusCode).toEqual(200);
    expect(res.json()).toEqual({ branches: ['master', 'new/branch', 'newBranch', 'test'] });
  });
});
