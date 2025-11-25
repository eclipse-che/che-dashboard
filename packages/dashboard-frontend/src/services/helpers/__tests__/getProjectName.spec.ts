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
});
