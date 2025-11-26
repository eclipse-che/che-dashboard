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

import { getProjectName, PROJECT_NAME_MAX_LENGTH } from '@/services/helpers/getProjectName';

describe('Get a project name based on location', () => {
  it('should return a valid name less then PROJECT_NAME_MAX_LENGTH symbols', () => {
    let cloneUrl = 'http://dummy/test.com/project-demo';

    cloneUrl += 'a'.repeat(100);
    const projectName = getProjectName(cloneUrl);

    expect(projectName.length).toBeLessThan(PROJECT_NAME_MAX_LENGTH);
  });

  it('should return a valid name which has the first char [a-z0-9]', () => {
    const cloneUrl = 'http://dummy/test.com/$_Project-Demo';

    const projectName = getProjectName(cloneUrl);

    expect(projectName).toEqual('project-demo');
  });

  it('should return a valid name which has the last char [a-z0-9]', () => {
    const cloneUrl = 'http://dummy/test.com/project-demo-$';

    const projectName = getProjectName(cloneUrl);

    expect(projectName).toEqual('project-demo');
  });

  it('should return a valid name after replacement of forbidden characters [^-a-z0-9] to "-"', () => {
    const cloneUrl = 'http://dummy/test.com/proj$$$$$___$ect-de$$$$_____mo';

    const projectName = getProjectName(cloneUrl);

    expect(projectName).toEqual('proj-ect-de-mo');
  });

  describe('URL with query parameters', () => {
    it('should strip query parameters from HTTPS URL', () => {
      const cloneUrl = 'https://github.com/user/test-repo.git?revision=feature-branch';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toEqual('test-repo');
    });

    it('should strip query parameters from SSH URL', () => {
      const cloneUrl = 'git@github.com:svor/python-hello-world.git?revision=my-branch';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toEqual('python-hello-world');
    });

    it('should strip multiple query parameters', () => {
      const cloneUrl =
        'https://github.com/eclipse-che/che-dashboard.git?revision=main&che-editor=che-code';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toEqual('che-dashboard');
    });

    it('should handle URL without query parameters', () => {
      const cloneUrl = 'https://github.com/user/simple-repo.git';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toEqual('simple-repo');
    });

    it('should strip query parameters and handle .git extension', () => {
      const cloneUrl = 'https://github.com/user/project.git?revision=test&new';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toEqual('project');
    });

    it('should strip query parameters from URL without .git extension', () => {
      const cloneUrl = 'https://gitlab.com/user/project?revision=main';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toEqual('project');
    });

    it('should handle SSH URL with query params and normalize name', () => {
      const cloneUrl = 'git@github.com:user/My_Project$Test.git?revision=branch&param=value';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toEqual('my-project-test');
    });

    it('should strip query parameters and truncate long names', () => {
      let cloneUrl = 'https://github.com/user/very-long-project-name';
      cloneUrl += 'a'.repeat(100);
      cloneUrl += '?revision=branch';

      const projectName = getProjectName(cloneUrl);

      expect(projectName.length).toBeLessThan(PROJECT_NAME_MAX_LENGTH);
      expect(projectName).not.toContain('?');
      expect(projectName).not.toContain('revision');
    });
  });

  describe('URLs with branch/tree references', () => {
    it('should extract repo name from GitHub URL with /tree/ (user example 1)', () => {
      const cloneUrl = 'git@github.com:eclipse-che/che-dashboard.git?revision=test-br&new';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toEqual('che-dashboard');
    });

    it('should extract repo name from GitHub URL with /tree/ and branch (user example 2)', () => {
      const cloneUrl =
        'https://github.com/eclipse-che/che-dashboard.git/tree/my-br?storageType=ephemeral';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toEqual('che-dashboard');
    });

    it('should extract repo name from GitLab URL with /-/tree/ (user example 3)', () => {
      const cloneUrl =
        'https://gitlab.com/oorel1/test-project.git/-/tree/qwerty?storageType=ephemeral&memoryLimit=2Gi';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toEqual('test-project');
    });

    it('should handle GitHub URL with /tree/ without query params', () => {
      const cloneUrl = 'https://github.com/user/my-repo/tree/main';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toEqual('my-repo');
    });

    it('should handle GitLab URL with /-/tree/ without .git extension', () => {
      const cloneUrl = 'https://gitlab.com/group/subgroup/project/-/tree/develop';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toEqual('project');
    });

    it('should handle Bitbucket URL with /src/ branch reference', () => {
      const cloneUrl = 'https://bitbucket.org/workspace/repository.git/src/main';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toEqual('repository');
    });

    it('should handle GitHub URL with /blob/ file reference', () => {
      const cloneUrl = 'https://github.com/user/repo/blob/main/README.md';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toEqual('repo');
    });

    it('should handle GitLab URL with /-/blob/ file reference', () => {
      const cloneUrl = 'https://gitlab.com/user/my-project/-/blob/develop/devfile.yaml';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toEqual('my-project');
    });

    it('should handle GitHub URL with /commits/ reference', () => {
      const cloneUrl = 'https://github.com/org/repo/commits/feature-branch';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toEqual('repo');
    });

    it('should handle nested GitLab groups', () => {
      const cloneUrl = 'https://gitlab.com/group1/group2/group3/my-app/-/tree/staging';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toEqual('my-app');
    });

    it('should extract repo name from GitHub URL with branch named gh-pages', () => {
      const cloneUrl = 'https://github.com/eclipse-che/blog/tree/gh-pages';

      const projectName = getProjectName(cloneUrl);

      // Should extract 'blog' (repo name), not 'gh-pages' (branch name)
      expect(projectName).toEqual('blog');
    });

    it('should handle URL where repo name matches a branch pattern keyword', () => {
      const cloneUrl = 'https://github.com/user/tree.git';

      const projectName = getProjectName(cloneUrl);

      // Should extract 'tree' as the repo name
      expect(projectName).toEqual('tree');
    });

    it('should handle GitHub URL with numeric branch', () => {
      const cloneUrl = 'https://github.com/org/project/tree/7.85.x';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toEqual('project');
    });

    it('should handle Che blog example with gh-pages branch and query params', () => {
      const cloneUrl = 'https://github.com/eclipse-che/blog/tree/gh-pages?storageType=ephemeral';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toEqual('blog');
    });
  });

  describe('Gist and raw file URLs', () => {
    it('should extract meaningful name from gist devfile URL (user example 4)', () => {
      const cloneUrl =
        'https://gist.githubusercontent.com/olexii4/dfb21012e08eedf8fc17ae608708fe87/raw/bec54efa905b915695dcb7fc5806cb4b456aa343/devfile.yaml?new';

      const projectName = getProjectName(cloneUrl);

      // Should extract username or gist ID instead of 'devfile'
      expect(projectName).toMatch(/olexii4|dfb21012e08eedf8fc17ae608708fe87/);
    });

    it('should handle raw GitHub content URL with devfile.yaml', () => {
      const cloneUrl = 'https://raw.githubusercontent.com/user/repo/main/devfile.yaml?token=abc';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toEqual('repo');
    });

    it('should handle gist URL with yaml file', () => {
      const cloneUrl = 'https://gist.githubusercontent.com/username/abc123/raw/file.yaml';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toMatch(/username|abc123/);
    });

    it('should handle URL with json file', () => {
      const cloneUrl = 'https://example.com/path/to/config.json';

      const projectName = getProjectName(cloneUrl);

      // Should try to find a better name than 'config'
      expect(projectName.length).toBeGreaterThan(0);
    });

    it('should extract from simple file URL', () => {
      const cloneUrl = 'https://example.com/devfile.yaml';

      const projectName = getProjectName(cloneUrl);

      // With limited segments, should extract the filename without extension
      expect(projectName).toEqual('devfile');
    });

    it('should extract filename from devfiles registry URL', () => {
      const cloneUrl = 'http://dummy-registry.io/devfiles/empty.yaml';

      const projectName = getProjectName(cloneUrl);

      // Should extract 'empty' from filename, not 'devfiles' (generic segment)
      expect(projectName).toEqual('empty');
    });

    it('should handle devfile registry with multiple path segments', () => {
      const cloneUrl = 'https://registry.devfile.io/devfiles/nodejs/devfile.yaml';

      const projectName = getProjectName(cloneUrl);

      // Should prefer 'nodejs' over 'devfile' or 'devfiles'
      expect(projectName).toEqual('nodejs');
    });
  });

  describe('SSH URLs from various Git providers', () => {
    it('should handle GitHub SSH URL', () => {
      const cloneUrl = 'git@github.com:user/repository.git';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toEqual('repository');
    });

    it('should handle GitLab SSH URL', () => {
      const cloneUrl = 'git@gitlab.com:namespace/project.git';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toEqual('project');
    });

    it('should handle GitLab SSH URL with groups', () => {
      const cloneUrl = 'git@gitlab.com:group1/group2/my-project.git';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toEqual('my-project');
    });

    it('should handle Bitbucket SSH URL', () => {
      const cloneUrl = 'git@bitbucket.org:workspace/repo-name.git';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toEqual('repo-name');
    });

    it('should handle Azure Repos SSH URL', () => {
      const cloneUrl = 'git@ssh.dev.azure.com:v3/organization/project/repository';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toEqual('repository');
    });

    it('should handle SSH URL with query parameters', () => {
      const cloneUrl = 'git@github.com:eclipse-che/che-dashboard.git?revision=test-br&new';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toEqual('che-dashboard');
    });

    it('should handle self-hosted GitLab SSH URL', () => {
      const cloneUrl = 'git@git.company.com:team/awesome-project.git';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toEqual('awesome-project');
    });

    it('should handle SSH URL without .git extension', () => {
      const cloneUrl = 'git@github.com:user/repo';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toEqual('repo');
    });
  });

  describe('Edge cases and special formats', () => {
    it('should handle SSH URL with colon separator', () => {
      const cloneUrl = 'git@gitlab.com:namespace/project.git';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toEqual('project');
    });

    it('should handle URL with multiple dots in name', () => {
      const cloneUrl = 'https://github.com/user/my.project.name.git';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toEqual('my-project-name');
    });

    it('should handle URL with underscores and special chars', () => {
      const cloneUrl = 'https://github.com/user/My_Cool__Project$123.git/tree/main';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toEqual('my-cool-project-123');
    });

    it('should handle very short URL', () => {
      const cloneUrl = 'a';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toEqual('a');
    });

    it('should handle empty segments in URL', () => {
      const cloneUrl = 'https://github.com//user//repo.git';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toEqual('repo');
    });

    it('should handle URL with only generic path segments', () => {
      const cloneUrl = 'https://server.com/refs/heads/main';

      const projectName = getProjectName(cloneUrl);

      // Should fallback to 'project' when only generic segments remain
      expect(projectName).toEqual('project');
    });

    it('should handle URL ending with slash', () => {
      const cloneUrl = 'https://github.com/user/my-repo/';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toEqual('my-repo');
    });

    it('should handle URL with multiple slashes at end', () => {
      const cloneUrl = 'https://github.com/user/my-repo///';

      const projectName = getProjectName(cloneUrl);

      expect(projectName).toEqual('my-repo');
    });
  });
});
