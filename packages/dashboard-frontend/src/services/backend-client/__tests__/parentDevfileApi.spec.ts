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

import { dump } from 'js-yaml';

import { getParentDevfile } from '@/services/backend-client/parentDevfileApi';
import devfileApi from '@/services/devfileApi';

const mockFetchRemoteData = jest.fn();
jest.mock('@/services/backend-client/dataResolverApi', () => {
  return {
    getDataResolver: async (href: string) => {
      return mockFetchRemoteData(href);
    },
  };
});

const _parentDevfile = {
  schemaVersion: '2.2.0',
  metadata: {
    name: 'nodejs',
  },
};

describe('Parent Devfile API', () => {
  let devfile: devfileApi.Devfile;

  beforeEach(() => {
    devfile = {
      schemaVersion: '2.2.0',
      metadata: {
        name: 'wksp-test',
      },
    } as devfileApi.Devfile;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('devfile without a parent', () => {
    it('should return undefined', async () => {
      const parentDevfile = await getParentDevfile(devfile);

      expect(mockFetchRemoteData).not.toHaveBeenCalled();
      expect(parentDevfile).toBeUndefined();
    });
  });
  describe('devfile with a parent', () => {
    describe('with registryUrl', () => {
      beforeEach(() => {
        devfile.parent = {
          id: 'nodejs',
          registryUrl: 'https://registry.devfile.io/',
        };
      });

      it('should fetch parent devfile', async () => {
        mockFetchRemoteData.mockResolvedValueOnce(dump(_parentDevfile));

        const parentDevfile = await getParentDevfile(devfile);

        expect(mockFetchRemoteData).toHaveBeenCalledWith(
          'https://registry.devfile.io//devfiles/nodejs',
        );
        expect(parentDevfile).toEqual(_parentDevfile);
      });
    });
    describe('with uri', () => {
      beforeEach(() => {
        devfile.parent = {
          uri: 'https://raw.githubusercontent.com/test/devfile.yaml',
        };
      });

      it('should fetch parent devfile', async () => {
        mockFetchRemoteData.mockResolvedValueOnce(dump(_parentDevfile));

        const parentDevfile = await getParentDevfile(devfile);

        expect(mockFetchRemoteData).toHaveBeenCalledWith(
          'https://raw.githubusercontent.com/test/devfile.yaml',
        );
        expect(parentDevfile).toEqual(_parentDevfile);
      });

      it('should return undefined on error happens', async () => {
        const error = new Error('Not Found');
        // mute the outputs
        console.error = jest.fn();
        mockFetchRemoteData.mockRejectedValue(error);

        const parentDevfile = await getParentDevfile(devfile);

        expect(mockFetchRemoteData).toHaveBeenCalledWith(
          'https://raw.githubusercontent.com/test/devfile.yaml',
        );

        expect(console.error).toHaveBeenCalledWith('Failed to fetch parent devfile', error);
        expect(parentDevfile).toBeUndefined();
      });
    });
  });
});
