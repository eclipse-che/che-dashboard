/*
 * Copyright (c) 2018-2024 Red Hat, Inc.
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

        // For SSH: ALL params extracted to overrideParams, URL is only the path
        expect(mockPost).toHaveBeenCalledWith('/api/factory/resolver', {
          url: 'git@github.com:svor/python-hello-world.git',
          revision: 'my-branch',
        });
        expect(mockFetchParentDevfile).toHaveBeenCalled();
      });

      it('should extract all parameters from SSH URL to overrideParams', async () => {
        mockPost.mockResolvedValueOnce({
          data: factoryResolver,
        });

        await getFactoryResolver(
          'git@github.com:svor/python-hello-world.git?revision=my-branch&sparse=1&df=custom.yaml',
          {},
        );

        // For SSH: ALL parameters go to overrideParams, URL has no query string
        expect(mockPost).toHaveBeenCalledWith('/api/factory/resolver', {
          url: 'git@github.com:svor/python-hello-world.git',
          revision: 'my-branch',
          sparse: '1',
          df: 'custom.yaml',
        });
        expect(mockFetchParentDevfile).toHaveBeenCalled();
      });

      it('should extract parameters and merge with existing overrideParams', async () => {
        mockPost.mockResolvedValueOnce({
          data: factoryResolver,
        });

        await getFactoryResolver(
          'git@github.com:svor/python-hello-world.git?revision=feature-branch&sparse=1',
          { someParam: 'value', anotherParam: 'test' },
        );

        expect(mockPost).toHaveBeenCalledWith('/api/factory/resolver', {
          url: 'git@github.com:svor/python-hello-world.git',
          someParam: 'value',
          anotherParam: 'test',
          revision: 'feature-branch',
          sparse: '1',
        });
        expect(mockFetchParentDevfile).toHaveBeenCalled();
      });

      it('should handle SSH URL without any parameters', async () => {
        mockPost.mockResolvedValueOnce({
          data: factoryResolver,
        });

        await getFactoryResolver('git@github.com:user/repo.git', {});

        expect(mockPost).toHaveBeenCalledWith('/api/factory/resolver', {
          url: 'git@github.com:user/repo.git',
        });
        expect(mockFetchParentDevfile).toHaveBeenCalled();
      });

      it('should decode URL-encoded parameters correctly', async () => {
        mockPost.mockResolvedValueOnce({
          data: factoryResolver,
        });

        await getFactoryResolver(
          'git@github.com:user/repo.git?revision=feature%2Fmy-branch',
          {},
        );

        expect(mockPost).toHaveBeenCalledWith('/api/factory/resolver', {
          url: 'git@github.com:user/repo.git',
          revision: 'feature/my-branch',
        });
        expect(mockFetchParentDevfile).toHaveBeenCalled();
      });

      it('should override existing params with URL params', async () => {
        mockPost.mockResolvedValueOnce({
          data: factoryResolver,
        });

        await getFactoryResolver('git@github.com:user/repo.git?revision=from-url&sparse=2', {
          revision: 'from-params',
          sparse: '1',
          keepThis: 'value',
        });

        // URL params should override existing overrideParams
        expect(mockPost).toHaveBeenCalledWith('/api/factory/resolver', {
          url: 'git@github.com:user/repo.git',
          revision: 'from-url',
          sparse: '2',
          keepThis: 'value',
        });
        expect(mockFetchParentDevfile).toHaveBeenCalled();
      });

      it('should handle complex SSH URL with multiple parameters', async () => {
        mockPost.mockResolvedValueOnce({
          data: factoryResolver,
        });

        await getFactoryResolver(
          'git@gitlab.com:team/project.git?revision=develop&sparse=1&df=custom.yaml&storageType=ephemeral',
          {},
        );

        // All parameters extracted, URL is clean path only
        expect(mockPost).toHaveBeenCalledWith('/api/factory/resolver', {
          url: 'git@gitlab.com:team/project.git',
          revision: 'develop',
          sparse: '1',
          df: 'custom.yaml',
          storageType: 'ephemeral',
        });
        expect(mockFetchParentDevfile).toHaveBeenCalled();
      });

      it('should handle SSH URL with only non-revision parameters', async () => {
        mockPost.mockResolvedValueOnce({
          data: factoryResolver,
        });

        await getFactoryResolver('git@github.com:user/repo.git?sparse=1&df=devfile.yaml', {});

        expect(mockPost).toHaveBeenCalledWith('/api/factory/resolver', {
          url: 'git@github.com:user/repo.git',
          sparse: '1',
          df: 'devfile.yaml',
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
