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

import { NoOpRegistryClient } from '@/devworkspaceClient/services/helpers/externalRegistry/NoOpRegistryClient';

describe('NoOpRegistryClient', () => {
  it('should return empty array for any namespace', async () => {
    const client = new NoOpRegistryClient('ghcr.io/myorg/backups');
    const result = await client.listWorkspaceBackups('user-che');
    expect(result).toEqual([]);
  });

  it('should log a warning mentioning the registry hostname', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const client = new NoOpRegistryClient('ghcr.io/myorg/backups');
    await client.listWorkspaceBackups('user-che');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('ghcr.io'));
    warnSpy.mockRestore();
  });
});
