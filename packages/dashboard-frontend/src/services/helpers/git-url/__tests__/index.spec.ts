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

import { normalizeGitUrl } from '@/services/helpers/git-url';

describe('normalizeGitUrl', () => {
  test.each([
    // all of these identify the same GitHub repository
    ['https://github.com/org/repo', 'github.com/org/repo'],
    ['https://github.com/org/repo/', 'github.com/org/repo'],
    ['https://github.com/org/repo.git', 'github.com/org/repo'],
    ['https://github.com/org/repo/tree/my-branch', 'github.com/org/repo'],
    ['https://github.com/org/repo/tree/feature/my-branch', 'github.com/org/repo'],
    ['https://user:token@github.com/org/repo.git', 'github.com/org/repo'],
    ['https://GitHub.com/Org/Repo.git', 'github.com/org/repo'],
    ['git@github.com:org/repo.git', 'github.com/org/repo'],
    ['ssh://git@github.com/org/repo', 'github.com/org/repo'],
    ['https://github.com/org/repo?df=devfile.yaml', 'github.com/org/repo'],
    // browse URLs of the other providers, so that a devfile remote still matches when
    // the factory URL happens to be one of them
    ['https://gitlab.com/org/repo/-/tree/my-branch', 'gitlab.com/org/repo'],
    ['https://gitlab.com/org/repo/-/blob/my-branch/devfile.yaml', 'gitlab.com/org/repo'],
    ['git@gitlab.com:group/subgroup/repo.git', 'gitlab.com/group/subgroup/repo'],
    ['https://bitbucket.org/org/repo/src/my-branch', 'bitbucket.org/org/repo'],
    ['https://bitbucket.org/org/repo.git', 'bitbucket.org/org/repo'],
    // Azure DevOps spells the same repository two ways, HTTPS and SSH
    ['https://dev.azure.com/org/proj/_git/repo', 'dev.azure.com/org/proj/repo'],
    ['https://org@dev.azure.com/org/proj/_git/repo', 'dev.azure.com/org/proj/repo'],
    ['git@ssh.dev.azure.com:v3/org/proj/repo', 'dev.azure.com/org/proj/repo'],
    ['ssh://git@ssh.dev.azure.com/v3/org/proj/repo', 'dev.azure.com/org/proj/repo'],
    // default ports say nothing about the repository, other ports do
    ['ssh://git@github.com:22/org/repo.git', 'github.com/org/repo'],
    ['https://github.com:443/org/repo.git', 'github.com/org/repo'],
    ['http://git.example.com:80/org/repo.git', 'git.example.com/org/repo'],
    ['ssh://git@git.example.com:7999/scm/proj/repo.git', 'git.example.com:7999/scm/proj/repo'],
    // a group, project or repository named after a browse marker is not a browse URL
    ['https://github.com/src/repo.git', 'github.com/src/repo'],
    ['https://github.com/tree/repo.git', 'github.com/tree/repo'],
    ['https://bitbucket.example/scm/src/repo.git', 'bitbucket.example/scm/src/repo'],
    ['https://gitlab.com/group/subgroup/src/repo.git', 'gitlab.com/group/subgroup/src/repo'],
    ['git@ssh.dev.azure.com:v3/org/src/repo', 'dev.azure.com/org/src/repo'],
    ['ssh://git@ssh.dev.azure.com/v3/org/src/repo', 'dev.azure.com/org/src/repo'],
    // GitHub Enterprise: arbitrary host, same browse shape
    ['https://github.example.com/org/repo/tree/my-branch', 'github.example.com/org/repo'],
    ['https://ghe.internal/org/repo/tree/feature/x', 'ghe.internal/org/repo'],
    ['https://gitlab.com/group/subgroup/repo/-/tree/feature/x', 'gitlab.com/group/subgroup/repo'],
    // self-hosted instances
    ['https://git.example.com/org/repo/-/tree/my-branch', 'git.example.com/org/repo'],
    ['https://git.example.com/org/repo.git', 'git.example.com/org/repo'],
    ['git@git.example.com:org/repo.git', 'git.example.com/org/repo'],
  ])('%s -> %s', (url, expected) => {
    expect(normalizeGitUrl(url)).toBe(expected);
  });

  test('should return undefined for an empty value', () => {
    expect(normalizeGitUrl(undefined)).toBeUndefined();
    expect(normalizeGitUrl('')).toBeUndefined();
    expect(normalizeGitUrl('   ')).toBeUndefined();
  });

  test('should equate the HTTPS, SSH and browse forms of the same repository', () => {
    const expected = normalizeGitUrl('https://github.com/org/repo.git');

    expect(normalizeGitUrl('git@github.com:org/repo.git')).toBe(expected);
    expect(normalizeGitUrl('https://github.com/org/repo/tree/main')).toBe(expected);
    expect(normalizeGitUrl('ssh://git@github.com/org/repo/')).toBe(expected);
    expect(normalizeGitUrl('ssh://git@github.com:22/org/repo.git')).toBe(expected);
  });

  test('should equate the Azure DevOps HTTPS and SSH clone layouts', () => {
    const expected = normalizeGitUrl('https://dev.azure.com/org/proj/_git/repo');

    expect(normalizeGitUrl('git@ssh.dev.azure.com:v3/org/proj/repo')).toBe(expected);
    expect(normalizeGitUrl('ssh://git@ssh.dev.azure.com/v3/org/proj/repo')).toBe(expected);
  });

  test('should not equate repositories served on different ports of one host', () => {
    expect(normalizeGitUrl('ssh://git@git.example.com:7999/org/repo.git')).not.toBe(
      normalizeGitUrl('ssh://git@git.example.com:2222/org/repo.git'),
    );
  });

  test('should not equate different repositories', () => {
    expect(normalizeGitUrl('https://github.com/org/repo.git')).not.toBe(
      normalizeGitUrl('https://github.com/org/other-repo.git'),
    );
    expect(normalizeGitUrl('https://github.com/org/repo.git')).not.toBe(
      normalizeGitUrl('https://gitlab.com/org/repo.git'),
    );
  });
});
