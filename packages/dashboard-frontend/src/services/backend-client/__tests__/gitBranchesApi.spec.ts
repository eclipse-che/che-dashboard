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

import mockAxios from 'axios';

import { fetchGitBranches } from '@/services/backend-client/gitBranchesApi';
import SessionStorageService, { SessionStorageKey } from '@/services/session-storage';

describe('fetch git branches', () => {
  const mockSessionStorageServiceGet = jest.fn();
  const mockSessionStorageServiceUpdate = jest.fn();
  const mockDateNow = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    SessionStorageService.update = mockSessionStorageServiceUpdate;
    SessionStorageService.get = mockSessionStorageServiceGet;
    Date.now = mockDateNow;
  });

  it('should set branches to storage', async () => {
    const branches = ['branch1', 'branch2'];
    const mockGet = mockAxios.get as jest.Mock;
    mockGet.mockResolvedValue({ data: { branches } });
    mockDateNow.mockReturnValue(0);

    await fetchGitBranches('url');
    expect(mockSessionStorageServiceUpdate).toHaveBeenCalledWith(
      SessionStorageKey.GIT_BRANCHES,
      JSON.stringify({
        url: { branches, lastFetched: 0 },
      }),
    );
  });

  it('should get branches from storage', async () => {
    const time = 1555555555555;
    const elapsedTime = 59 * 60 * 1000;
    mockDateNow.mockReturnValue(time + elapsedTime);
    const storageData = { url: { branches: ['branch1', 'branch2'], lastFetched: time } };
    mockSessionStorageServiceGet.mockReturnValue(JSON.stringify(storageData));

    const response = await fetchGitBranches('url');

    expect(response.branches).toEqual(storageData.url.branches);
  });
});
