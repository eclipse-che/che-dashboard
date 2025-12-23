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

import { getBranches } from '@/services/gitClient';
const response =
  'c9440b0ca811e5d8e7abeee8467e1219d5ca4cb6\trefs/heads/master ' +
  '0fa45f3539ca69615d0ccd8e0277fb7f12ee7715\trefs/heads/new/branch ' +
  '42c6289f142a5589f206425d812d0b125ab87990\trefs/heads/newBranch ' +
  '0e647bc78ac310d96251d581e5498b1503729e87\trefs/tags/test ' +
  'fb3a99a405876f16e2dcb231a061d5a3f735b2aa\trefs/pull/809/head';
jest.mock('@/devworkspaceClient/services/helpers/exec', () => {
  return {
    run: async () => response,
  };
});
describe('helpers', () => {
  test('test get branches', async () => {
    const arr = [
      'https://github.com/username/repository.git',
      'https://gitlab.com/username/group/subgroup/repository.git',
      'https://username@bitbucket.org/username/repository.git',
      'https://username:password@git.company.com/project/repo.git',
      'git@github.com:username/repository.git',
      'git@gitlab.com:username/repository.git',
      'git@bitbucket.org:username/repository.git',
      'ssh://git@github.com/username/repository.git',
      'ssh://git@git.company.com:2222/group/project.git',
      'http://192.168.1.50/git/project.git',
      'http://git.internal-corp.local/dev-team/backend.git',
      'https://git-codecommit.us-east-1.amazonaws.com/v1/repos/MyRepo',
      'ssh://YOUR-SSH-KEY-ID@git-codecommit.us-east-1.amazonaws.com/v1/repos/MyRepo',
      'https://dev.azure.com/YourOrganization/YourProject/_git/YourRepo',
      'git@ssh.dev.azure.com:v3/YourOrganization/YourProject/YourRepo',
      'https://source.developers.google.com/p/project-id/r/repository-name',
      'ssh://source.developers.google.com:2022/p/project-id/r/repository-name',
      'git://github.com/username/project.git',
      'git://server.local/project.git',
      'https://192.168.1.5/git/repo.git',
      'git@192.168.1.5:user/repo.git',
      'ssh://git@192.168.1.5:2222/user/repo.git',
      'ssh://git@[2001:db8::1]/path/to/repo.git',
    ];
    for (const url of arr) {
      const res = await getBranches(url);
      expect(res).toEqual({ branches: ['master', 'new/branch', 'newBranch', 'test'] });
    }
  });

  test('should not validate git url', async () => {
    const url = 'invalid url';
    await expect(() => getBranches(url)).rejects.toThrow('Invalid repository url');
  });
});
