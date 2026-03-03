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

import { BACKUP_IMAGE_URL_PATTERN } from '../backup';

describe('BACKUP_IMAGE_URL_PATTERN', () => {
  describe('valid URLs', () => {
    it.each([
      [
        'OpenShift internal registry',
        'image-registry.openshift-image-registry.svc:5000/user-che/my-workspace:latest',
      ],
      ['external registry, 2 segments', 'quay.io/namespace/workspace:latest'],
      [
        'external registry, deep path',
        'quay.io/org-name/project/user-1-namespace/workspace-1:latest',
      ],
      [
        'custom registry with port',
        'registry.example.com:8080/ns/workspace:v1.0',
      ],
      ['non-latest tag', 'registry.io/ns/workspace:20240101-abc123'],
      ['tag with dots and dashes', 'registry.io/ns/workspace:1.2.3-alpha'],
      [
        'path segments with underscores and dots',
        'quay.io/my_org/my.workspace/image:latest',
      ],
      [
        'uppercase (case-insensitive)',
        'Registry.Example.COM/NS/Workspace:Latest',
      ],
      ['localhost registry', 'localhost/ns/workspace:latest'],
      ['localhost with port', 'localhost:5000/ns/workspace:latest'],
    ])('%s', (_description, url) => {
      expect(BACKUP_IMAGE_URL_PATTERN.test(url)).toBe(true);
    });
  });

  describe('invalid URLs', () => {
    it.each([
      ['only one path segment (no namespace)', 'registry.io/workspace:latest'],
      ['no registry, two bare segments', 'namespace/workspace:latest'],
      ['missing tag', 'registry.io/namespace/workspace'],
      ['empty tag', 'registry.io/namespace/workspace:'],
      ['leading slash', '/namespace/workspace:latest'],
      ['http:// prefix', 'http://registry.io/ns/workspace:latest'],
      ['https:// prefix', 'https://registry.io/ns/workspace:latest'],
      ['empty string', ''],
      ['just a hostname', 'registry.io'],
    ])('%s', (_description, url) => {
      expect(BACKUP_IMAGE_URL_PATTERN.test(url)).toBe(false);
    });
  });
});
