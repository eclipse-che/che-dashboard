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

import * as k8s from '@kubernetes/client-node';

import { findApi } from '@/helpers/findApi';

describe('findApi', () => {
  const mockGetAPIVersions = jest.fn();
  const apisApi = {
    getAPIVersions: mockGetAPIVersions,
  } as unknown as k8s.ApisApi;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when API group exists without version filter', async () => {
    mockGetAPIVersions.mockResolvedValue({
      groups: [
        { name: 'workspace.devfile.io', versions: [{ version: 'v1alpha2' }] },
        { name: 'other.api', versions: [{ version: 'v1' }] },
      ],
    });

    const result = await findApi(apisApi, 'workspace.devfile.io');

    expect(result).toBe(true);
  });

  it('should return false when API group does not exist without version filter', async () => {
    mockGetAPIVersions.mockResolvedValue({
      groups: [{ name: 'other.api', versions: [{ version: 'v1' }] }],
    });

    const result = await findApi(apisApi, 'workspace.devfile.io');

    expect(result).toBe(false);
  });

  it('should return true when API group exists with matching version', async () => {
    mockGetAPIVersions.mockResolvedValue({
      groups: [{ name: 'workspace.devfile.io', versions: [{ version: 'v1alpha2' }] }],
    });

    const result = await findApi(apisApi, 'workspace.devfile.io', 'v1alpha2');

    expect(result).toBe(true);
  });

  it('should return false when API group exists but version does not match', async () => {
    mockGetAPIVersions.mockResolvedValue({
      groups: [{ name: 'workspace.devfile.io', versions: [{ version: 'v1alpha2' }] }],
    });

    const result = await findApi(apisApi, 'workspace.devfile.io', 'v1');

    expect(result).toBe(false);
  });

  it('should return false when API group does not exist with version filter', async () => {
    mockGetAPIVersions.mockResolvedValue({
      groups: [{ name: 'other.api', versions: [{ version: 'v1' }] }],
    });

    const result = await findApi(apisApi, 'workspace.devfile.io', 'v1alpha2');

    expect(result).toBe(false);
  });
});
