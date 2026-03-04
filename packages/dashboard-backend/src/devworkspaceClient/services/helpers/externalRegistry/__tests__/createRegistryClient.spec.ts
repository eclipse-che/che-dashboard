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

import { createRegistryClient } from '@/devworkspaceClient/services/helpers/externalRegistry';
import { NoOpRegistryClient } from '@/devworkspaceClient/services/helpers/externalRegistry/NoOpRegistryClient';
import { QuayRegistryClient } from '@/devworkspaceClient/services/helpers/externalRegistry/QuayRegistryClient';

describe('createRegistryClient', () => {
  it('should return QuayRegistryClient for quay.io registry path', () => {
    const client = createRegistryClient('quay.io/org/backups', 'token');
    expect(client).toBeInstanceOf(QuayRegistryClient);
  });

  it('should return NoOpRegistryClient for unknown registry', () => {
    const client = createRegistryClient('ghcr.io/org/backups', 'token');
    expect(client).toBeInstanceOf(NoOpRegistryClient);
  });

  it('should return NoOpRegistryClient for Docker Hub', () => {
    const client = createRegistryClient('docker.io/org/backups', 'token');
    expect(client).toBeInstanceOf(NoOpRegistryClient);
  });

  it('should return NoOpRegistryClient when token is empty', () => {
    const client = createRegistryClient('quay.io/org/backups', '');
    expect(client).toBeInstanceOf(NoOpRegistryClient);
  });
});
