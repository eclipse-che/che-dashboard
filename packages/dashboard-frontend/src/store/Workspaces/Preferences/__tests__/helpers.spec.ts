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

import {
  extractRepo,
  gitProviderPatterns,
  isTrustedRepo,
} from '@/store/Workspaces/Preferences/helpers';

describe('helpers', () => {
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
    describe('GitHub', () => {
      const trustedRepoHttpsUrls = ['https://github.com/user/repo'];
      const trustedRepoGitSshUrls = ['git@github.com:user/repo.git'];

      test('trusted HTTPS URL', () => {
        expect(isTrustedRepo(trustedRepoHttpsUrls, 'https://github.com/user/repo/')).toBe(true);
        expect(isTrustedRepo(trustedRepoGitSshUrls, 'https://github.com/user/repo/')).toBe(true);
      });

      test('trusted GIT+SSH URL', () => {
        expect(isTrustedRepo(trustedRepoHttpsUrls, 'git@github.com:user/repo.git')).toBe(true);
        expect(isTrustedRepo(trustedRepoGitSshUrls, 'git@github.com:user/repo.git')).toBe(true);
      });

      test('untrusted HTTPS URL', () => {
        expect(isTrustedRepo(trustedRepoHttpsUrls, 'https://github.com/another-user/repo/')).toBe(
          false,
        );
        expect(isTrustedRepo(trustedRepoGitSshUrls, 'https://github.com/another-user/repo/')).toBe(
          false,
        );
      });

      test('untrusted GIT+SSH URL', () => {
        expect(isTrustedRepo(trustedRepoHttpsUrls, 'git@github.com:another-user/repo.git')).toBe(
          false,
        );
        expect(isTrustedRepo(trustedRepoGitSshUrls, 'git@github.com:another-user/repo.git')).toBe(
          false,
        );
      });
    });

    describe('GitLab', () => {
      const trustedRepoHttpsUrls = ['https://gitlab.com/user/repo'];
      const trustedRepoGitSshUrls = ['git@gitlab.com:user/repo.git'];

      test('trusted HTTPS URL', () => {
        expect(isTrustedRepo(trustedRepoHttpsUrls, 'https://gitlab.com/user/repo')).toBe(true);
        expect(isTrustedRepo(trustedRepoGitSshUrls, 'https://gitlab.com/user/repo')).toBe(true);
      });

      test('trusted GIT+SSH URL', () => {
        expect(isTrustedRepo(trustedRepoHttpsUrls, 'git@gitlab.com:user/repo.git')).toBe(true);
        expect(isTrustedRepo(trustedRepoGitSshUrls, 'git@gitlab.com:user/repo.git')).toBe(true);
      });

      test('untrusted HTTPS URL', () => {
        expect(isTrustedRepo(trustedRepoHttpsUrls, 'https://gitlab.com/another-user/repo')).toBe(
          false,
        );
        expect(isTrustedRepo(trustedRepoGitSshUrls, 'https://gitlab.com/another-user/repo')).toBe(
          false,
        );
      });

      test('untrusted GIT+SSH URL', () => {
        expect(isTrustedRepo(trustedRepoHttpsUrls, 'git@gitlab.com:another-user/repo.git')).toBe(
          false,
        );
        expect(isTrustedRepo(trustedRepoGitSshUrls, 'git@gitlab.com:another-user/repo.git')).toBe(
          false,
        );
      });
    });

    describe('Bitbucket', () => {
      const trustedRepoHttpsUrls = ['https://bitbucket.org/user/repo'];
      const trustedRepoGitSshUrls = ['git@bitbucket.org:user/repo.git'];

      test('trusted HTTPS URL', () => {
        expect(isTrustedRepo(trustedRepoHttpsUrls, 'https://bitbucket.org/user/repo')).toBe(true);
        expect(isTrustedRepo(trustedRepoGitSshUrls, 'https://bitbucket.org/user/repo')).toBe(true);
      });

      test('trusted GIT+SSH URL', () => {
        expect(isTrustedRepo(trustedRepoHttpsUrls, 'git@bitbucket.org:user/repo.git')).toBe(true);
        expect(isTrustedRepo(trustedRepoGitSshUrls, 'git@bitbucket.org:user/repo.git')).toBe(true);
      });

      test('untrusted HTTPS URL', () => {
        expect(isTrustedRepo(trustedRepoHttpsUrls, 'https://bitbucket.org/another-user/repo')).toBe(
          false,
        );
        expect(
          isTrustedRepo(trustedRepoGitSshUrls, 'https://bitbucket.org/another-user/repo'),
        ).toBe(false);
      });

      test('untrusted GIT+SSH URL', () => {
        expect(isTrustedRepo(trustedRepoHttpsUrls, 'git@bitbucket.org:another-user/repo.git')).toBe(
          false,
        );
        expect(
          isTrustedRepo(trustedRepoGitSshUrls, 'git@bitbucket.org:another-user/repo.git'),
        ).toBe(false);
      });
    });

    describe('Azure DevOps', () => {
      const trustedRepoHttpsUrls = ['https://dev.azure.com/organization/project/_git/repo'];
      const trustedRepoGitSshUrls = ['git@ssh.dev.azure.com:v3/organization/project/repo'];

      test('trusted HTTPS URL', () => {
        expect(
          isTrustedRepo(
            trustedRepoHttpsUrls,
            'https://dev.azure.com/organization/project/_git/repo',
          ),
        ).toBe(true);
        expect(
          isTrustedRepo(
            trustedRepoGitSshUrls,
            'https://dev.azure.com/organization/project/_git/repo',
          ),
        ).toBe(true);
      });

      test('trusted GIT+SSH URL', () => {
        expect(
          isTrustedRepo(trustedRepoHttpsUrls, 'git@ssh.dev.azure.com:v3/organization/project/repo'),
        ).toBe(true);
        expect(
          isTrustedRepo(
            trustedRepoGitSshUrls,
            'git@ssh.dev.azure.com:v3/organization/project/repo',
          ),
        ).toBe(true);
      });

      test('untrusted HTTPS URL', () => {
        expect(
          isTrustedRepo(
            trustedRepoHttpsUrls,
            'https://dev.azure.com/another-organization/project/_git/repo',
          ),
        ).toBe(false);
        expect(
          isTrustedRepo(
            trustedRepoGitSshUrls,
            'https://dev.azure.com/another-organization/project/_git/repo',
          ),
        ).toBe(false);
      });

      test('untrusted GIT+SSH URL', () => {
        expect(
          isTrustedRepo(
            trustedRepoHttpsUrls,
            'git@ssh.dev.azure.com:v3/another-organization/project/repo',
          ),
        ).toBe(false);
        expect(
          isTrustedRepo(
            trustedRepoGitSshUrls,
            'git@ssh.dev.azure.com:v3/another-organization/project/repo',
          ),
        ).toBe(false);
      });
    });
  });
});
