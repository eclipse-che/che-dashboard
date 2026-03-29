/*
 * Copyright (c) 2018-2026 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { KubeConfig } from '@kubernetes/client-node';

import { DevWorkspaceClient } from '@/devworkspaceClient';

const mockGetDWClient = jest.fn();
const mockGetKubeConfig = jest.fn();

jest.mock('@/services/kubeclient/dwClientProvider', () => ({
  DwClientProvider: jest.fn().mockImplementation(() => ({
    getDWClient: mockGetDWClient,
  })),
}));

jest.mock('@/services/kubeclient/kubeConfigProvider', () => ({
  KubeConfigProvider: jest.fn().mockImplementation(() => ({
    getKubeConfig: mockGetKubeConfig,
  })),
}));

import { getDevWorkspaceClient, getKubeConfig } from '@/routes/api/helpers/getDevWorkspaceClient';

describe('getDevWorkspaceClient helper', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return DevWorkspaceClient for the given token', () => {
    const stubClient = {} as DevWorkspaceClient;
    mockGetDWClient.mockReturnValue(stubClient);

    const result = getDevWorkspaceClient('test-token');

    expect(mockGetDWClient).toHaveBeenCalledWith('test-token');
    expect(result).toBe(stubClient);
  });

  test('should return KubeConfig for the given token', () => {
    const stubKubeConfig = new KubeConfig();
    mockGetKubeConfig.mockReturnValue(stubKubeConfig);

    const result = getKubeConfig('test-token');

    expect(mockGetKubeConfig).toHaveBeenCalledWith('test-token');
    expect(result).toBe(stubKubeConfig);
  });
});
