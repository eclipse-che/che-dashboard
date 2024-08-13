/*
 * Copyright (c) 2018-2024 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import {
  extractRepo,
  gitProviderPatterns,
  isAzureDevOpsRepo,
  isBitbucketRepo,
  isGitHubRepo,
  isGitLabRepo,
  isTrustedRepo,
} from '@/store/Workspaces/Preferences/helpers';

describe('helpers', () => {
  const knownProviders = {
    github: {
      https: 'https://github.com/user/repo',
      ssh: 'git@github.com:user/repo.git',
    },
    gitlab: {
      https: 'https://gitlab.com/user/repo',
      ssh: 'git@gitlab.com:user/repo.git',
    },
    bitbucket: {
      https: 'https://bitbucket.org/user/repo',
      ssh: 'git@bitbucket.org:user/repo.git',
    },
    azureDevOps: {
      https: 'https://dev.azure.com/user/project/_git/repo',
      ssh: 'git@ssh.dev.azure.com:v3/user/project/repo.git',
    },
  };

  test('isGitHub', () => {
    expect(isGitHubRepo('https://github.com/user/repo')).toBe(true);
    expect(isGitHubRepo('https://github.com/user/repo/tree/feature')).toBe(true);
    expect(isGitHubRepo('https://github.com/user/repo/blob/main/devfile.yaml')).toBe(true);

    expect(isGitHubRepo(knownProviders.gitlab.https)).toBe(false);
    expect(isGitHubRepo(knownProviders.bitbucket.https)).toBe(false);
    expect(isGitHubRepo(knownProviders.azureDevOps.https)).toBe(false);

    expect(isGitHubRepo('git@github.com:user/repo')).toBe(true);
    expect(isGitHubRepo('git@github.com:user/repo.git')).toBe(true);
    expect(isGitHubRepo('ssh://git@github.com:user/repo.git')).toBe(true);

    expect(isGitHubRepo(knownProviders.gitlab.ssh)).toBe(false);
    expect(isGitHubRepo(knownProviders.bitbucket.ssh)).toBe(false);
    expect(isGitHubRepo(knownProviders.azureDevOps.ssh)).toBe(false);
  });

  test('isGitLabRepo', () => {
    expect(isGitLabRepo('https://gitlab.com/user/repo')).toBe(true);
    expect(isGitLabRepo('https://gitlab.com/user/repo/tree/feature')).toBe(true);
    expect(isGitLabRepo('https://gitlab.com/user/repo/blob/main/devfile.yaml')).toBe(true);

    expect(isGitLabRepo(knownProviders.github.https)).toBe(false);
    expect(isGitLabRepo(knownProviders.bitbucket.https)).toBe(false);
    expect(isGitLabRepo(knownProviders.azureDevOps.https)).toBe(false);

    expect(isGitLabRepo('git@gitlab.com:user/repo')).toBe(true);
    expect(isGitLabRepo('git@gitlab.com:user/repo.git')).toBe(true);
    expect(isGitLabRepo('ssh://git@gitlab.com:user/repo.git')).toBe(true);

    expect(isGitLabRepo(knownProviders.github.ssh)).toBe(false);
    expect(isGitLabRepo(knownProviders.bitbucket.ssh)).toBe(false);
    expect(isGitLabRepo(knownProviders.azureDevOps.ssh)).toBe(false);
  });

  test('isBitbucketRepo', () => {
    expect(isBitbucketRepo('https://bitbucket.org/user/repo')).toBe(true);
    expect(isBitbucketRepo('https://bitbucket.org/user/repo/src/feature')).toBe(true);
    expect(isBitbucketRepo('https://bitbucket.org/user/repo/src/main/devfile.yaml')).toBe(true);

    expect(isBitbucketRepo(knownProviders.github.https)).toBe(false);
    expect(isBitbucketRepo(knownProviders.gitlab.https)).toBe(false);
    expect(isBitbucketRepo(knownProviders.azureDevOps.https)).toBe(false);

    expect(isBitbucketRepo('git@bitbucket.org:user/repo')).toBe(true);
    expect(isBitbucketRepo('git@bitbucket.org:user/repo.git')).toBe(true);
    expect(isBitbucketRepo('ssh://git@bitbucket.org:user/repo.git')).toBe(true);

    expect(isBitbucketRepo(knownProviders.github.ssh)).toBe(false);
    expect(isBitbucketRepo(knownProviders.gitlab.ssh)).toBe(false);
    expect(isBitbucketRepo(knownProviders.azureDevOps.ssh)).toBe(false);
  });

  test('isAzureDevOpsRepo', () => {
    expect(
      isAzureDevOpsRepo('https://organization@dev.azure.com/organization/project/_git/repo'),
    ).toBe(true);
    expect(
      isAzureDevOpsRepo('https://dev.azure.com/organization/project/_git/repo?version=GBfeature'),
    ).toBe(true);
    expect(
      isAzureDevOpsRepo(
        'https://dev.azure.com/organization/project/_git/repo?version=GBfeature&path=/devfile.yaml',
      ),
    ).toBe(true);
    expect(
      isAzureDevOpsRepo('https://dev.azure.com/organization/project/_git/repo?path=/devfile.yaml'),
    ).toBe(true);

    expect(isAzureDevOpsRepo(knownProviders.github.https)).toBe(false);
    expect(isAzureDevOpsRepo(knownProviders.gitlab.https)).toBe(false);
    expect(isAzureDevOpsRepo(knownProviders.bitbucket.https)).toBe(false);

    expect(isAzureDevOpsRepo('git@ssh.dev.azure.com:v3/organization/project/repo')).toBe(true);
    expect(isAzureDevOpsRepo('ssh://git@ssh.dev.azure.com:v3/organization/project/repo')).toBe(
      true,
    );

    expect(isAzureDevOpsRepo(knownProviders.github.ssh)).toBe(false);
    expect(isAzureDevOpsRepo(knownProviders.gitlab.ssh)).toBe(false);
    expect(isAzureDevOpsRepo(knownProviders.bitbucket.ssh)).toBe(false);
  });

  describe('extract repository', () => {
    test('GitHub', () => {
      expect(extractRepo('https://github.com/user/repo', gitProviderPatterns.github.https)).toEqual(
        'user/repo',
      );
      expect(
        extractRepo('https://github.com/user/repo/tree/feature', gitProviderPatterns.github.https),
      ).toEqual('user/repo');
      expect(
        extractRepo(
          'https://github.com/user/repo/blob/main/devfile.yaml',
          gitProviderPatterns.github.https,
        ),
      ).toEqual('user/repo');

      expect(extractRepo('git@github.com:user/repo', gitProviderPatterns.github.ssh)).toEqual(
        'user/repo',
      );
      expect(extractRepo('git@github.com:user/repo.git', gitProviderPatterns.github.ssh)).toEqual(
        'user/repo',
      );
      expect(
        extractRepo('ssh://git@github.com:user/repo.git', gitProviderPatterns.github.ssh),
      ).toEqual('user/repo');
      expect(
        extractRepo('git+ssh://git@github.com:user/repo.git', gitProviderPatterns.github.ssh),
      ).toEqual('user/repo');
    });

    test('GitLab', () => {
      expect(extractRepo('https://gitlab.com/user/repo', gitProviderPatterns.gitlab.https)).toEqual(
        'user/repo',
      );
      expect(
        extractRepo('https://gitlab.com/user/repo/tree/feature', gitProviderPatterns.gitlab.https),
      ).toEqual('user/repo');
      expect(
        extractRepo(
          'https://gitlab.com/user/repo/blob/main/devfile.yaml',
          gitProviderPatterns.gitlab.https,
        ),
      ).toEqual('user/repo');

      expect(extractRepo('git@gitlab.com:user/repo', gitProviderPatterns.gitlab.ssh)).toEqual(
        'user/repo',
      );
      expect(extractRepo('git@gitlab.com:user/repo.git', gitProviderPatterns.gitlab.ssh)).toEqual(
        'user/repo',
      );
      expect(
        extractRepo('ssh://git@gitlab.com:user/repo.git', gitProviderPatterns.gitlab.ssh),
      ).toEqual('user/repo');
      expect(
        extractRepo('git+ssh://git@gitlab.com:user/repo.git', gitProviderPatterns.gitlab.ssh),
      ).toEqual('user/repo');
    });

    test('Bitbucket', () => {
      expect(
        extractRepo('https://bitbucket.org/user/repo', gitProviderPatterns.bitbucket.https),
      ).toEqual('user/repo');
      expect(
        extractRepo(
          'https://bitbucket.org/user/repo/src/feature',
          gitProviderPatterns.bitbucket.https,
        ),
      ).toEqual('user/repo');
      expect(
        extractRepo(
          'https://bitbucket.org/user/repo/src/main/devfile.yaml',
          gitProviderPatterns.bitbucket.https,
        ),
      ).toEqual('user/repo');

      expect(extractRepo('git@bitbucket.org:user/repo', gitProviderPatterns.bitbucket.ssh)).toEqual(
        'user/repo',
      );
      expect(
        extractRepo('git@bitbucket.org:user/repo.git', gitProviderPatterns.bitbucket.ssh),
      ).toEqual('user/repo');
      expect(
        extractRepo('ssh://git@bitbucket.org:user/repo.git', gitProviderPatterns.bitbucket.ssh),
      ).toEqual('user/repo');
    });

    test('Azure DevOps', () => {
      expect(
        extractRepo(
          'https://organization@dev.azure.com/organization/project/_git/repo',
          gitProviderPatterns.azureDevOps.https,
        ),
      ).toEqual('organization/project/repo');
      expect(
        extractRepo(
          'https://dev.azure.com/organization/project/_git/repo?version=GBfeature',
          gitProviderPatterns.azureDevOps.https,
        ),
      ).toEqual('organization/project/repo');
      expect(
        extractRepo(
          'https://dev.azure.com/organization/project/_git/repo?version=GBfeature&path=/README.md',
          gitProviderPatterns.azureDevOps.https,
        ),
      ).toEqual('organization/project/repo');

      expect(
        extractRepo(
          'git@ssh.dev.azure.com:v3/organization/project/repo',
          gitProviderPatterns.azureDevOps.ssh,
        ),
      ).toEqual('organization/project/repo');
      expect(
        extractRepo(
          'ssh://git@ssh.dev.azure.com:v3/organization/project/repo',
          gitProviderPatterns.azureDevOps.ssh,
        ),
      ).toEqual('organization/project/repo');
    });
  });

  describe('isTrustedRepo', () => {
    const trustedRepoURLs = [
      'https://github.com/user/repo',
      'https://gitlab.com/user/repo',
      'https://bitbucket.org/user/repo',
      'https://dev.azure.com/organization/project/_git/repo',
      'git@github.com:user/repo.git',
      'git@gitlab.com:user/repo.git',
      'git@bitbucket.org:user/repo.git',
      'git@ssh.dev.azure.com:v3/organization/project/repo',
    ];

    test('should return true for a trusted GitHub URL', () => {
      expect(isTrustedRepo(trustedRepoURLs, 'https://github.com/user/repo/')).toBe(true);
    });

    test('should return true for a trusted GitLab URL', () => {
      expect(isTrustedRepo(trustedRepoURLs, 'https://gitlab.com/user/repo')).toBe(true);
    });

    test('should return true for a trusted Bitbucket URL', () => {
      expect(isTrustedRepo(trustedRepoURLs, 'https://bitbucket.org/user/repo')).toBe(true);
    });

    test('should return true for a trusted Azure DevOps URL', () => {
      expect(
        isTrustedRepo(trustedRepoURLs, 'https://dev.azure.com/organization/project/_git/repo'),
      ).toBe(true);
    });

    test('should return true for a trusted GitHub SSH URL', () => {
      expect(isTrustedRepo(trustedRepoURLs, 'git@github.com:user/repo.git')).toBe(true);
    });

    test('should return true for a trusted GitLab SSH URL', () => {
      expect(isTrustedRepo(trustedRepoURLs, 'git@gitlab.com:user/repo.git')).toBe(true);
    });

    test('should return true for a trusted Bitbucket SSH URL', () => {
      expect(isTrustedRepo(trustedRepoURLs, 'git@bitbucket.org:user/repo.git')).toBe(true);
    });

    test('should return true for a trusted Azure DevOps SSH URL', () => {
      expect(
        isTrustedRepo(trustedRepoURLs, 'git@ssh.dev.azure.com:v3/organization/project/repo'),
      ).toBe(true);
    });

    test('should return false for an untrusted GitHub URL', () => {
      expect(isTrustedRepo(trustedRepoURLs, 'https://github.com/anotheruser/anotherrepo')).toBe(
        false,
      );
    });

    test('should return false for an untrusted GitLab URL', () => {
      expect(isTrustedRepo(trustedRepoURLs, 'https://gitlab.com/anotheruser/anotherrepo')).toBe(
        false,
      );
    });

    test('should return false for an untrusted Bitbucket URL', () => {
      expect(isTrustedRepo(trustedRepoURLs, 'https://bitbucket.org/anotheruser/anotherrepo')).toBe(
        false,
      );
    });

    test('should return false for an untrusted Azure DevOps URL', () => {
      expect(
        isTrustedRepo(
          trustedRepoURLs,
          'https://dev.azure.com/anotherorg/anotherproject/_git/anotherrepo',
        ),
      ).toBe(false);
    });

    test('should return false for an untrusted GitHub SSH URL', () => {
      expect(isTrustedRepo(trustedRepoURLs, 'git@github.com:anotheruser/anotherrepo.git')).toBe(
        false,
      );
    });

    test('should return false for an untrusted GitLab SSH URL', () => {
      expect(isTrustedRepo(trustedRepoURLs, 'git@gitlab.com:anotheruser/anotherrepo.git')).toBe(
        false,
      );
    });

    test('should return false for an untrusted Bitbucket SSH URL', () => {
      expect(isTrustedRepo(trustedRepoURLs, 'git@bitbucket.org:anotheruser/anotherrepo.git')).toBe(
        false,
      );
    });

    test('should return false for an untrusted Azure DevOps SSH URL', () => {
      expect(
        isTrustedRepo(
          trustedRepoURLs,
          'git@ssh.dev.azure.com:v3/anotherorg/anotherproject/anotherrepo',
        ),
      ).toBe(false);
    });
  });
});
