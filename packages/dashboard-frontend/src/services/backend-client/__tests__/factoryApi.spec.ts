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

import { getFactoryResolver, refreshFactoryOauthToken } from '@/services/backend-client/factoryApi';
import devfileApi from '@/services/devfileApi';
import { FactoryResolver } from '@/services/helpers/types';

const mockFetchParentDevfile = jest.fn();
jest.mock('@/services/backend-client/parentDevfileApi', () => {
  return {
    getParentDevfile: async (href: string) => {
      return mockFetchParentDevfile(href);
    },
  };
});

describe('Factory API', () => {
  const mockPost = mockAxios.post as jest.Mock;

  const location = 'https://github.com/eclipse-che/che-dashboard.git';
  const factoryResolver: FactoryResolver = {
    v: '4.0',
    source: 'devfile.yaml',
    scm_info: {
      clone_url: location,
      scm_provider: 'github',
    },
    devfile: {
      schemaVersion: '2.2.1',
      metadata: {
        name: 'che-dashboard',
        namespace: 'namespace',
      },
    } as devfileApi.Devfile,
    links: [],
  };

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('resolve factory', () => {
    beforeEach(() => {
      mockFetchParentDevfile.mockResolvedValueOnce(expect.anything());
    });
    it('should call "/factory/resolver"', async () => {
      mockPost.mockResolvedValueOnce({
        data: expect.anything(),
      });
      await getFactoryResolver(
        'https://test.azure.com/_git/public-repo?version=GBtest%2Fbranch',
        {},
      );

      expect(mockPost).toHaveBeenCalledWith('/api/factory/resolver', {
        url: 'https://test.azure.com/_git/public-repo?version=GBtest/branch',
      });
      expect(mockFetchParentDevfile).toHaveBeenCalled();
    });

    it('should return a factory resolver', async () => {
      mockPost.mockResolvedValueOnce({
        data: factoryResolver,
      });

      const res = await getFactoryResolver(location, {});

      expect(mockFetchParentDevfile).toHaveBeenCalled();
      expect(res).toEqual(factoryResolver);
    });

    it('should remove revision parameter from SSH URL and not leave trailing "?"', async () => {
      mockPost.mockResolvedValueOnce({
        data: factoryResolver,
      });

      await getFactoryResolver('git@github.com:svor/python-hello-world.git?revision=my-branch', {});

      expect(mockPost).toHaveBeenCalledWith('/api/factory/resolver', {
        url: 'git@github.com:svor/python-hello-world.git',
      });
      expect(mockFetchParentDevfile).toHaveBeenCalled();
    });

    it('should remove revision parameter from SSH URL but keep other parameters', async () => {
      mockPost.mockResolvedValueOnce({
        data: factoryResolver,
      });

      await getFactoryResolver(
        'git@github.com:svor/python-hello-world.git?revision=my-branch&sparse=1',
        {},
      );

      expect(mockPost).toHaveBeenCalledWith('/api/factory/resolver', {
        url: 'git@github.com:svor/python-hello-world.git?sparse=1',
      });
      expect(mockFetchParentDevfile).toHaveBeenCalled();
    });

    it('should preserve HTTP location parameters as-is', async () => {
      mockPost.mockResolvedValueOnce({
        data: factoryResolver,
      });

      await getFactoryResolver(
        'https://github.com/eclipse-che/che-dashboard.git?revision=my-branch',
        {},
      );

      expect(mockPost).toHaveBeenCalledWith('/api/factory/resolver', {
        url: 'https://github.com/eclipse-che/che-dashboard.git?revision=my-branch',
      });
      expect(mockFetchParentDevfile).toHaveBeenCalled();
    });
  });

  describe('refresh factory OAuth token', () => {
    it('should call "/api/factory/token/refresh?url=${url}"', async () => {
      mockPost.mockResolvedValueOnce({
        data: expect.anything(),
      });

      await refreshFactoryOauthToken(location);

      expect(mockPost).toHaveBeenCalledWith(
        '/api/factory/token/refresh?url=https://github.com/eclipse-che/che-dashboard.git',
      );
    });

    it('should return undefined', async () => {
      mockPost.mockResolvedValueOnce(undefined);

      const res = await refreshFactoryOauthToken(location);

      expect(res).toBeUndefined();
    });
  });
});
