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

    describe('HTTP locations', () => {
      it('should call "/factory/resolver" with decoded Azure URL parameters', async () => {
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

      it('should preserve revision parameter in HTTP URL and not extract to overrideParams', async () => {
        mockPost.mockResolvedValueOnce({
          data: factoryResolver,
        });

        await getFactoryResolver(
          'https://github.com/eclipse-che/che-dashboard.git?revision=my-branch',
          {},
        );

        // For HTTP URLs, revision stays in URL and is NOT added to overrideParams
        expect(mockPost).toHaveBeenCalledWith('/api/factory/resolver', {
          url: 'https://github.com/eclipse-che/che-dashboard.git?revision=my-branch',
        });
        expect(mockFetchParentDevfile).toHaveBeenCalled();
      });

      it('should preserve all parameters in HTTP URL', async () => {
        mockPost.mockResolvedValueOnce({
          data: factoryResolver,
        });

        await getFactoryResolver(
          'https://github.com/user/repo.git?revision=main&sparse=1&df=devfile.yaml',
          { existingParam: 'value' },
        );

        expect(mockPost).toHaveBeenCalledWith('/api/factory/resolver', {
          url: 'https://github.com/user/repo.git?revision=main&sparse=1&df=devfile.yaml',
          existingParam: 'value',
        });
        expect(mockFetchParentDevfile).toHaveBeenCalled();
      });
    });

    describe('SSH locations', () => {
      it('should extract revision from SSH URL with only revision parameter (user example)', async () => {
        mockPost.mockResolvedValueOnce({
          data: factoryResolver,
        });

        // This is the user's specific example
        await getFactoryResolver(
          'git@github.com:svor/python-hello-world.git?revision=my-branch',
          {},
        );

        // Expected output: url without revision, revision in overrideParams
        expect(mockPost).toHaveBeenCalledWith('/api/factory/resolver', {
          url: 'git@github.com:svor/python-hello-world.git',
          revision: 'my-branch',
        });
        expect(mockFetchParentDevfile).toHaveBeenCalled();
      });

      it('should extract revision and merge with existing overrideParams', async () => {
        mockPost.mockResolvedValueOnce({
          data: factoryResolver,
        });

        await getFactoryResolver(
          'git@github.com:svor/python-hello-world.git?revision=feature-branch',
          { someParam: 'value', anotherParam: 'test' },
        );

        expect(mockPost).toHaveBeenCalledWith('/api/factory/resolver', {
          url: 'git@github.com:svor/python-hello-world.git',
          someParam: 'value',
          anotherParam: 'test',
          revision: 'feature-branch',
        });
        expect(mockFetchParentDevfile).toHaveBeenCalled();
      });

      it('should extract revision from SSH URL and keep other parameters in URL', async () => {
        mockPost.mockResolvedValueOnce({
          data: factoryResolver,
        });

        await getFactoryResolver(
          'git@github.com:svor/python-hello-world.git?revision=my-branch&sparse=1',
          {},
        );

        expect(mockPost).toHaveBeenCalledWith('/api/factory/resolver', {
          url: 'git@github.com:svor/python-hello-world.git?sparse=1',
          revision: 'my-branch',
        });
        expect(mockFetchParentDevfile).toHaveBeenCalled();
      });

      it('should extract revision and preserve multiple other parameters', async () => {
        mockPost.mockResolvedValueOnce({
          data: factoryResolver,
        });

        await getFactoryResolver(
          'git@gitlab.com:team/project.git?sparse=1&revision=develop&df=custom.yaml',
          {},
        );

        expect(mockPost).toHaveBeenCalledWith('/api/factory/resolver', {
          url: 'git@gitlab.com:team/project.git?sparse=1&df=custom.yaml',
          revision: 'develop',
        });
        expect(mockFetchParentDevfile).toHaveBeenCalled();
      });

      it('should handle SSH URL without revision parameter', async () => {
        mockPost.mockResolvedValueOnce({
          data: factoryResolver,
        });

        await getFactoryResolver('git@github.com:user/repo.git', {});

        expect(mockPost).toHaveBeenCalledWith('/api/factory/resolver', {
          url: 'git@github.com:user/repo.git',
        });
        expect(mockFetchParentDevfile).toHaveBeenCalled();
      });

      it('should handle SSH URL with revision containing special characters', async () => {
        mockPost.mockResolvedValueOnce({
          data: factoryResolver,
        });

        await getFactoryResolver('git@github.com:user/repo.git?revision=feature%2Fmy-branch', {});

        expect(mockPost).toHaveBeenCalledWith('/api/factory/resolver', {
          url: 'git@github.com:user/repo.git',
          revision: 'feature/my-branch',
        });
        expect(mockFetchParentDevfile).toHaveBeenCalled();
      });

      it('should not override existing revision in overrideParams', async () => {
        mockPost.mockResolvedValueOnce({
          data: factoryResolver,
        });

        await getFactoryResolver('git@github.com:user/repo.git?revision=from-url', {
          revision: 'from-params',
        });

        // URL revision should override the existing revision in overrideParams
        expect(mockPost).toHaveBeenCalledWith('/api/factory/resolver', {
          url: 'git@github.com:user/repo.git',
          revision: 'from-url',
        });
        expect(mockFetchParentDevfile).toHaveBeenCalled();
      });
    });

    it('should return a factory resolver', async () => {
      mockPost.mockResolvedValueOnce({
        data: factoryResolver,
      });

      const res = await getFactoryResolver(location, {});

      expect(mockFetchParentDevfile).toHaveBeenCalled();
      expect(res).toEqual(factoryResolver);
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
