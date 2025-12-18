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

import { getRepoFromLocation } from '@/services/helpers/factoryFlow/getRepoFromLocation';

describe('getRepoFromLocation', () => {
  describe('GitHub URLs', () => {
    it('should return clean repo URL', () => {
      expect(getRepoFromLocation('https://github.com/user/repo')).toBe(
        'https://github.com/user/repo',
      );
    });

    it('should remove /tree/branch path', () => {
      expect(getRepoFromLocation('https://github.com/user/repo/tree/main')).toBe(
        'https://github.com/user/repo',
      );
    });

    it('should remove /blob/branch/file path', () => {
      expect(getRepoFromLocation('https://github.com/user/repo/blob/main/README.md')).toBe(
        'https://github.com/user/repo',
      );
    });

    it('should remove /commits/branch path', () => {
      expect(getRepoFromLocation('https://github.com/user/repo/commits/feature')).toBe(
        'https://github.com/user/repo',
      );
    });

    it('should remove query parameters', () => {
      expect(getRepoFromLocation('https://github.com/user/repo?ref=main')).toBe(
        'https://github.com/user/repo',
      );
    });
  });

  describe('GitLab URLs', () => {
    it('should return clean repo URL', () => {
      expect(getRepoFromLocation('https://gitlab.com/group/project')).toBe(
        'https://gitlab.com/group/project',
      );
    });

    it('should remove /-/tree/branch path', () => {
      expect(getRepoFromLocation('https://gitlab.com/group/project/-/tree/main')).toBe(
        'https://gitlab.com/group/project',
      );
    });

    it('should remove /-/blob/branch/file path', () => {
      expect(getRepoFromLocation('https://gitlab.com/group/project/-/blob/main/file.ts')).toBe(
        'https://gitlab.com/group/project',
      );
    });
  });

  describe('Bitbucket URLs', () => {
    it('should return clean repo URL', () => {
      expect(getRepoFromLocation('https://bitbucket.org/team/repo')).toBe(
        'https://bitbucket.org/team/repo',
      );
    });

    it('should remove /src/branch path', () => {
      expect(getRepoFromLocation('https://bitbucket.org/team/repo/src/main')).toBe(
        'https://bitbucket.org/team/repo',
      );
    });
  });

  describe('Azure DevOps URLs', () => {
    it('should return clean repo URL for dev.azure.com', () => {
      expect(getRepoFromLocation('https://dev.azure.com/org/project/_git/repo')).toBe(
        'https://dev.azure.com/org/project/_git/repo',
      );
    });

    it('should handle subdomain azure.com URLs', () => {
      expect(getRepoFromLocation('https://org.visualstudio.azure.com/project/_git/repo')).toBe(
        'https://org.visualstudio.azure.com/project/_git/repo',
      );
    });
  });

  describe('Edge cases', () => {
    it('should remove trailing slashes', () => {
      expect(getRepoFromLocation('https://github.com/user/repo/')).toBe(
        'https://github.com/user/repo',
      );
    });

    it('should handle SSH URLs', () => {
      expect(getRepoFromLocation('git@github.com:user/repo.git')).toBe(
        'git@github.com:user/repo.git',
      );
    });

    it('should handle URLs with query and branch path', () => {
      expect(getRepoFromLocation('https://github.com/user/repo/tree/main?tab=readme')).toBe(
        'https://github.com/user/repo',
      );
    });
  });
});
