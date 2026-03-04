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

import { detectRegistryType } from '@/devworkspaceClient/services/helpers/externalRegistry/IExternalRegistryClient';

describe('detectRegistryType', () => {
  it('should detect OpenShift internal registry', () => {
    expect(detectRegistryType('image-registry.openshift-image-registry.svc:5000')).toBe(
      'openshift-internal',
    );
  });

  it('should detect OpenShift route-exposed internal registry', () => {
    expect(
      detectRegistryType('default-route-openshift-image-registry.apps.cluster.example.com'),
    ).toBe('openshift-internal');
  });

  it('should detect quay.io', () => {
    expect(detectRegistryType('quay.io/my-org/backups')).toBe('quay');
  });

  it('should return unknown for Docker Hub', () => {
    expect(detectRegistryType('docker.io/myorg/backups')).toBe('unknown');
  });

  it('should return unknown for GHCR', () => {
    expect(detectRegistryType('ghcr.io/myorg/backups')).toBe('unknown');
  });

  it('should return unknown for empty string', () => {
    expect(detectRegistryType('')).toBe('unknown');
  });
});
