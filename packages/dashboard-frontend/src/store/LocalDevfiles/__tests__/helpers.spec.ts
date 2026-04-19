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

import { extractProjectNames } from '@/store/LocalDevfiles';

describe('extractProjectNames', () => {
  test('returns empty array when no projects section exists', () => {
    const content = `schemaVersion: 2.2.2
metadata:
  name: my-project
components:
  - name: tools
    container:
      image: node:18`;

    expect(extractProjectNames(content)).toEqual([]);
  });

  test('returns project names from projects section', () => {
    const content = `schemaVersion: 2.2.2
metadata:
  name: my-project
projects:
  - name: frontend
    git:
      remotes:
        origin: https://github.com/user/frontend.git
  - name: backend
    git:
      remotes:
        origin: https://github.com/user/backend.git`;

    expect(extractProjectNames(content)).toEqual(['frontend', 'backend']);
  });

  test('returns single project name', () => {
    const content = `schemaVersion: 2.2.2
projects:
  - name: my-app
    git:
      remotes:
        origin: https://github.com/user/app.git`;

    expect(extractProjectNames(content)).toEqual(['my-app']);
  });

  test('does not include component names as project names', () => {
    const content = `schemaVersion: 2.2.2
components:
  - name: tools
    container:
      image: node:18
projects:
  - name: my-app
    git:
      remotes:
        origin: https://github.com/user/app.git`;

    const result = extractProjectNames(content);
    expect(result).toEqual(['my-app']);
    expect(result).not.toContain('tools');
  });

  test('returns empty array when projects section has no entries', () => {
    const content = `schemaVersion: 2.2.2
metadata:
  name: my-project
projects: []`;

    expect(extractProjectNames(content)).toEqual([]);
  });

  test('does not include component or endpoint names when projects is before components', () => {
    const content = `schemaVersion: 2.2.2
metadata:
  name: go-web-server
projects:
  - name: gritty
    git:
      remotes:
        origin: https://github.com/cloudcmd/gritty.git
components:
  - name: tools
    container:
      image: registry.access.redhat.com/ubi9/nodejs-20:latest
      endpoints:
        - name: http
          targetPort: 1337
  - name: npm-cache
    volume:
      size: 1Gi`;

    const result = extractProjectNames(content);
    expect(result).toEqual(['gritty']);
  });

  test('handles multiple projects with various whitespace', () => {
    const content = `schemaVersion: 2.2.2
projects:
  - name: app-one
    git:
      remotes:
        origin: https://github.com/user/one.git
  - name: app-two
    git:
      remotes:
        origin: https://github.com/user/two.git
  - name: app-three
    git:
      remotes:
        origin: https://github.com/user/three.git`;

    expect(extractProjectNames(content)).toEqual(['app-one', 'app-two', 'app-three']);
  });
});
