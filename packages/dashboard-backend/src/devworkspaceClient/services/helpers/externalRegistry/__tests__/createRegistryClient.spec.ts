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
import { OciRegistryClient } from '@/devworkspaceClient/services/helpers/externalRegistry/OciRegistryClient';

describe('createRegistryClient', () => {
  it('should return OciRegistryClient for quay.io registry path', () => {
    const client = createRegistryClient('quay.io/org/backups', 'token');
    expect(client).toBeInstanceOf(OciRegistryClient);
  });

  it('should return OciRegistryClient for GHCR registry path', () => {
    const client = createRegistryClient('ghcr.io/org/backups', 'token');
    expect(client).toBeInstanceOf(OciRegistryClient);
  });

  it('should return OciRegistryClient for Docker Hub', () => {
    const client = createRegistryClient('docker.io/org/backups', 'token');
    expect(client).toBeInstanceOf(OciRegistryClient);
  });

  it('should return OciRegistryClient for Harbor', () => {
    const client = createRegistryClient('harbor.example.com/project', 'token');
    expect(client).toBeInstanceOf(OciRegistryClient);
  });

  it('should return OciRegistryClient when auth is empty (public repos)', () => {
    const client = createRegistryClient('quay.io/org/backups', '');
    expect(client).toBeInstanceOf(OciRegistryClient);
  });
});
