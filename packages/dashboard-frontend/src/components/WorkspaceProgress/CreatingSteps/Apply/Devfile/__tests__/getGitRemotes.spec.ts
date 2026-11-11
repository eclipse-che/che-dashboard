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
  configureProjectRemotes,
  getGitRemotes,
  GitRemote,
  sanitizeValue,
} from '@/components/WorkspaceProgress/CreatingSteps/Apply/Devfile/getGitRemotes';
import devfileApi from '@/services/devfileApi';

describe('getGitRemotes functions', () => {
  describe('getGitRemotes()', () => {
    it('should return remotes when one remote is provided', () => {
      const input = '{https://github.com/test1/che-dashboard}';
      const expected: GitRemote[] = [
        { name: 'origin', url: 'https://github.com/test1/che-dashboard' },
      ];
      expect(getGitRemotes(input)).toMatchObject(expected);
    });

    it('should return remotes when two remotes are provided', () => {
      const input =
        '{https://github.com/test1/che-dashboard, https://github.com/test2/che-dashboard}';
      const expected: GitRemote[] = [
        { name: 'origin', url: 'https://github.com/test1/che-dashboard' },
        { name: 'upstream', url: 'https://github.com/test2/che-dashboard' },
      ];
      expect(getGitRemotes(input)).toMatchObject(expected);
    });

    it('should return remotes when three remotes are provided', () => {
      const input =
        '{https://github.com/test1/che-dashboard, https://github.com/test2/che-dashboard, https://github.com/test3/che-dashboard}';
      const expected: GitRemote[] = [
        { name: 'origin', url: 'https://github.com/test1/che-dashboard' },
        { name: 'upstream', url: 'https://github.com/test2/che-dashboard' },
        { name: 'fork1', url: 'https://github.com/test3/che-dashboard' },
      ];
      expect(getGitRemotes(input)).toMatchObject(expected);
    });

    it('should return remotes when two remotes with names are provided', () => {
      const input =
        '{{test1,https://github.com/test1/che-dashboard},{test2,https://github.com/test2/che-dashboard}}';
      const expected: GitRemote[] = [
        { name: 'test1', url: 'https://github.com/test1/che-dashboard' },
        { name: 'test2', url: 'https://github.com/test2/che-dashboard' },
      ];
      expect(getGitRemotes(input)).toMatchObject(expected);
    });

    it('should return remotes when one remote with name is provided', () => {
      const input = '{{test1,https://github.com/test1/che-dashboard}}';
      const expected: GitRemote[] = [
        { name: 'test1', url: 'https://github.com/test1/che-dashboard' },
      ];
      expect(getGitRemotes(input)).toMatchObject(expected);
    });

    it('should return remotes when multiple remotes with names are provided', () => {
      const input =
        '{{test1,https://github.com/test1/che-dashboard},{test2,https://github.com/test2/che-dashboard},{test3,https://github.com/test3/che-dashboard},{test4,https://github.com/test4/che-dashboard}}';
      const expected: GitRemote[] = [
        { name: 'test1', url: 'https://github.com/test1/che-dashboard' },
        { name: 'test2', url: 'https://github.com/test2/che-dashboard' },
        { name: 'test3', url: 'https://github.com/test3/che-dashboard' },
        { name: 'test4', url: 'https://github.com/test4/che-dashboard' },
      ];
      expect(getGitRemotes(input)).toMatchObject(expected);
    });

    it('should throw error when cannot parse remotes input', () => {
      const input =
        '{{https://github.com/test1/che-dashboard,https://github.com/test2/che-dashboard}';
      expect(() => {
        getGitRemotes(input);
      }).toThrow();
    });
  });

  describe('sanitizeValue()', () => {
    it('should remove all whitespaces', () => {
      const input =
        '[ https://github.com/test1/che-dashboard, https://github.com/test2/che-dashboard   ] ';
      const expected =
        '["https://github.com/test1/che-dashboard","https://github.com/test2/che-dashboard"]';
      expect(sanitizeValue(input)).toBe(expected);
    });

    it('should convert left braces', () => {
      const input =
        '{{test,https://github.com/test1/che-dashboard],{test2,https://github.com/test2/che-dashboard]]';
      const expected =
        '[["test","https://github.com/test1/che-dashboard"],["test2","https://github.com/test2/che-dashboard"]]';
      expect(sanitizeValue(input)).toBe(expected);
    });

    it('should convert right braces', () => {
      const input =
        '[[test,https://github.com/test1/che-dashboard},[test2,https://github.com/test2/che-dashboard}}';
      const expected =
        '[["test","https://github.com/test1/che-dashboard"],["test2","https://github.com/test2/che-dashboard"]]';
      expect(sanitizeValue(input)).toBe(expected);
    });

    it('should add quotations beside left square brackets', () => {
      const input =
        '[[test","https://github.com/test1/che-dashboard"],[test2","https://github.com/test2/che-dashboard"]]';
      const expected =
        '[["test","https://github.com/test1/che-dashboard"],["test2","https://github.com/test2/che-dashboard"]]';
      expect(sanitizeValue(input)).toBe(expected);
    });

    it('should add quotations beside right square brackets', () => {
      const input =
        '[["test","https://github.com/test1/che-dashboard],["test2","https://github.com/test2/che-dashboard]]';
      const expected =
        '[["test","https://github.com/test1/che-dashboard"],["test2","https://github.com/test2/che-dashboard"]]';
      expect(sanitizeValue(input)).toBe(expected);
    });

    it('should add quotations when in between two strings', () => {
      const input =
        '[["test,https://github.com/test1/che-dashboard"],["test2,https://github.com/test2/che-dashboard"]]';
      const expected =
        '[["test","https://github.com/test1/che-dashboard"],["test2","https://github.com/test2/che-dashboard"]]';
      expect(sanitizeValue(input)).toBe(expected);
    });
  });

  describe('configureProjectRemotes()', () => {
    let dashboardDevfile: devfileApi.Devfile;

    beforeEach(() => {
      dashboardDevfile = {
        schemaVersion: '2.1.0',
        metadata: {
          name: 'new-project',
          namespace: 'user-che',
        },
        projects: [
          {
            name: 'dashboard',
            git: {
              remotes: {
                origin: 'https://github.com/user/che-dashboard.git',
              },
            },
          },
        ],
      };
    });

    test('remotes configured with urls', () => {
      const remotes = '{http://git-test-1.git,http://git-test-2.git,http://git-test-3.git}';
      configureProjectRemotes(dashboardDevfile, remotes, false, 'HEAD');

      expect(dashboardDevfile.projects).not.toBe(undefined);
      expect(dashboardDevfile.projects?.length).toBe(1);
      expect(dashboardDevfile.projects?.[0]).toMatchObject({
        git: {
          checkoutFrom: {
            remote: 'origin',
          },
          remotes: {
            origin: 'http://git-test-1.git',
            upstream: 'http://git-test-2.git',
            fork1: 'http://git-test-3.git',
          },
        },
      });
    });

    test('remotes configured with urls and names', () => {
      const remotes =
        '{{test1,http://git-test-1.git},{test2,http://git-test-2.git},{test3,http://git-test-3.git}}';
      configureProjectRemotes(dashboardDevfile, remotes, false, 'HEAD');

      expect(dashboardDevfile.projects).not.toBe(undefined);
      expect(dashboardDevfile.projects?.length).toBe(1);
      expect(dashboardDevfile.projects?.[0]).toMatchObject({
        git: {
          checkoutFrom: {
            remote: 'origin',
          },
          remotes: {
            origin: 'https://github.com/user/che-dashboard.git',
            test1: 'http://git-test-1.git',
            test2: 'http://git-test-2.git',
            test3: 'http://git-test-3.git',
          },
        },
      });
    });

    test('keep origin remote if origin remote not provided as a parameter', () => {
      const remotes =
        '{{upstream,https://github.com/eclipse-che/che-dashboard.git},{fork,https://github.com/fork/che-dashboard.git}}';
      configureProjectRemotes(dashboardDevfile, remotes, false, 'HEAD');

      expect(dashboardDevfile.projects).not.toBe(undefined);
      expect(dashboardDevfile.projects?.length).toBe(1);
      expect(dashboardDevfile.projects?.[0]).toMatchObject({
        git: {
          checkoutFrom: {
            remote: 'origin',
          },
          remotes: {
            origin: 'https://github.com/user/che-dashboard.git',
            upstream: 'https://github.com/eclipse-che/che-dashboard.git',
            fork: 'https://github.com/fork/che-dashboard.git',
          },
        },
      });
    });

    test('keep origin remote and branch if origin remote not provided as a parameter', () => {
      dashboardDevfile.projects = [
        {
          name: 'dashboard',
          git: {
            checkoutFrom: {
              revision: 'branch',
            },
            remotes: {
              origin: 'https://github.com/user/che-dashboard.git',
            },
          },
        },
      ];
      const remotes =
        '{{upstream,https://github.com/eclipse-che/che-dashboard.git},{fork,https://github.com/fork/che-dashboard.git}}';
      configureProjectRemotes(dashboardDevfile, remotes, false, 'HEAD');

      expect(dashboardDevfile.projects).not.toBe(undefined);
      expect(dashboardDevfile.projects?.length).toBe(1);
      expect(dashboardDevfile.projects?.[0]).toMatchObject({
        git: {
          checkoutFrom: {
            remote: 'origin',
            revision: 'HEAD',
          },
          remotes: {
            origin: 'https://github.com/user/che-dashboard.git',
            upstream: 'https://github.com/eclipse-che/che-dashboard.git',
            fork: 'https://github.com/fork/che-dashboard.git',
          },
        },
      });
    });

    test('use new origin remote if provided as a parameter', () => {
      const remotes =
        '{{origin,https://github.com/other-user/che-dashboard.git},{upstream,https://github.com/eclipse-che/che-dashboard.git},{fork,https://github.com/fork/che-dashboard.git}}';
      configureProjectRemotes(dashboardDevfile, remotes, false, 'HEAD');

      expect(dashboardDevfile.projects).not.toBe(undefined);
      expect(dashboardDevfile.projects?.length).toBe(1);
      expect(dashboardDevfile.projects?.[0]).toMatchObject({
        git: {
          checkoutFrom: {
            remote: 'origin',
          },
          remotes: {
            origin: 'https://github.com/other-user/che-dashboard.git',
            upstream: 'https://github.com/eclipse-che/che-dashboard.git',
            fork: 'https://github.com/fork/che-dashboard.git',
          },
        },
      });
    });

    test('use default devfile when there is no project url, but remotes exist', () => {
      const defaultDevfile = {
        schemaVersion: '2.1.0',
        metadata: {
          generateName: 'empty',
        },
      } as devfileApi.Devfile;
      const remotes = '{https://github.com/eclipse-che/che-dashboard.git}';
      configureProjectRemotes(defaultDevfile, remotes, true, 'HEAD');

      const expectedDevfile = {
        schemaVersion: '2.1.0',
        metadata: {
          generateName: 'che-dashboard',
          name: 'che-dashboard',
        },
        projects: [
          {
            git: {
              checkoutFrom: { remote: 'origin', revision: 'HEAD' },
              remotes: {
                origin: 'https://github.com/eclipse-che/che-dashboard.git',
              },
            },
            name: 'che-dashboard',
          },
        ],
      };
      expect(defaultDevfile).toStrictEqual(expectedDevfile);
    });
  });

  describe('configureProjectRemotes() with multiple Git projects', () => {
    const SOURCE_URL = 'https://github.com/user/weebo-che-project';

    function buildMultiProjectDevfile(): devfileApi.Devfile {
      return {
        schemaVersion: '2.3.0',
        metadata: { name: 'weebo-che-project' },
        projects: [
          {
            name: 'main',
            git: { remotes: { origin: 'https://github.com/user/weebo-che-project.git' } },
          },
          {
            name: 'dashboard',
            git: {
              remotes: { origin: 'https://github.com/other/che-dashboard.git' },
              checkoutFrom: { revision: 'develop' },
            },
          },
          {
            name: 'che-code',
            git: {
              remotes: {
                origin: 'https://github.com/other/che-code.git',
                fork: 'https://github.com/user/che-code.git',
              },
              checkoutFrom: { remote: 'origin', revision: 'develop' },
            },
          },
        ],
      } as devfileApi.Devfile;
    }

    test('should configure only the project matching the factory URL', () => {
      const devfile = buildMultiProjectDevfile();

      configureProjectRemotes(devfile, undefined, false, 'my-branch', SOURCE_URL);

      // the project the factory URL points at is checked out at the requested revision
      expect(devfile.projects?.[0]).toStrictEqual({
        name: 'main',
        git: {
          remotes: { origin: 'https://github.com/user/weebo-che-project.git' },
          checkoutFrom: { remote: 'origin', revision: 'my-branch' },
        },
      });
      // the other projects are left untouched
      expect(devfile.projects?.[1]).toStrictEqual(buildMultiProjectDevfile().projects?.[1]);
      expect(devfile.projects?.[2]).toStrictEqual(buildMultiProjectDevfile().projects?.[2]);
    });

    test('should not throw when several Git projects are present (CHE-23991)', () => {
      const devfile = buildMultiProjectDevfile();

      expect(() =>
        configureProjectRemotes(
          devfile,
          undefined,
          false,
          'demo-cant-create-workspace',
          `${SOURCE_URL}/tree/demo-cant-create-workspace`,
        ),
      ).not.toThrow();

      expect(devfile.projects?.[0].git?.checkoutFrom?.revision).toBe('demo-cant-create-workspace');
    });

    test.each([
      ['GitLab tree URL', 'https://gitlab.com/user/weebo/-/tree/my-branch'],
      ['GitLab blob URL', 'https://gitlab.com/user/weebo/-/blob/my-branch/devfile.yaml'],
      ['Bitbucket src URL', 'https://bitbucket.org/user/weebo/src/my-branch'],
      ['SSH URL', 'git@gitlab.com:user/weebo.git'],
    ])('should match the project by %s', (_label, sourceUrl) => {
      const devfile = {
        schemaVersion: '2.3.0',
        metadata: { name: 'weebo' },
        projects: [
          { name: 'other', git: { remotes: { origin: 'https://github.com/other/other.git' } } },
          { name: 'weebo', git: { remotes: { origin: `${getHost(sourceUrl)}/user/weebo.git` } } },
        ],
      } as devfileApi.Devfile;

      configureProjectRemotes(devfile, undefined, false, 'my-branch', sourceUrl);

      expect(devfile.projects?.[1].git?.checkoutFrom).toStrictEqual({
        remote: 'origin',
        revision: 'my-branch',
      });
      expect(devfile.projects?.[0].git?.checkoutFrom).toBeUndefined();
    });

    test('should add the remotes to the matching project only', () => {
      const devfile = buildMultiProjectDevfile();
      const remotes = '{{upstream,https://github.com/upstream/weebo-che-project.git}}';

      configureProjectRemotes(devfile, remotes, false, 'HEAD', SOURCE_URL);

      expect(devfile.projects?.[0].git?.remotes).toStrictEqual({
        origin: 'https://github.com/user/weebo-che-project.git',
        upstream: 'https://github.com/upstream/weebo-che-project.git',
      });
      expect(devfile.projects?.[1].git?.remotes).toStrictEqual({
        origin: 'https://github.com/other/che-dashboard.git',
      });
    });

    test('should skip configuration when no project matches and no remotes were requested', () => {
      const devfile = buildMultiProjectDevfile();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

      configureProjectRemotes(
        devfile,
        undefined,
        false,
        'my-branch',
        'https://github.com/user/unrelated-repo',
      );

      expect(devfile.projects).toStrictEqual(buildMultiProjectDevfile().projects);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    test('should throw when no project matches and remotes were explicitly requested', () => {
      const devfile = buildMultiProjectDevfile();
      const remotes = '{{upstream,https://github.com/upstream/weebo-che-project.git}}';

      expect(() =>
        configureProjectRemotes(
          devfile,
          remotes,
          false,
          'HEAD',
          'https://github.com/user/unrelated-repo',
        ),
      ).toThrow(
        "Unable to configure remotes: no project in the Devfile has a remote matching 'https://github.com/user/unrelated-repo'.",
      );
    });

    test('should check out from the remote the factory URL points at, not from origin', () => {
      const devfile = buildMultiProjectDevfile();

      // the factory URL points at the `fork` remote of the `che-code` project, so the
      // revision has to be resolved against that remote and not against origin
      configureProjectRemotes(
        devfile,
        undefined,
        false,
        'feature-x',
        'https://github.com/user/che-code/tree/feature-x',
      );

      expect(devfile.projects?.[2].git?.checkoutFrom).toStrictEqual({
        remote: 'fork',
        revision: 'feature-x',
      });
      expect(devfile.projects?.[0]).toStrictEqual(buildMultiProjectDevfile().projects?.[0]);
    });

    test.each([
      ['an undefined', undefined],
      ['an empty', ''],
      ['a blank', '   '],
    ])('should name the factory URL in the error when it is %s string', (_label, sourceUrl) => {
      const devfile = buildMultiProjectDevfile();
      const remotes = '{{upstream,https://github.com/upstream/weebo-che-project.git}}';

      expect(() => configureProjectRemotes(devfile, remotes, false, 'HEAD', sourceUrl)).toThrow(
        'Unable to configure remotes: no project in the Devfile has a remote matching the factory URL.',
      );
    });

    test('should name the factory URL in the warning when it is undefined', () => {
      const devfile = buildMultiProjectDevfile();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

      configureProjectRemotes(devfile, undefined, false, 'my-branch', undefined);

      expect(warnSpy).toHaveBeenCalledWith(
        'No Devfile project matches the factory URL. Skipping the Git remotes configuration.',
      );
      warnSpy.mockRestore();
    });
  });

  describe('configureProjectRemotes() edge cases', () => {
    test('should not throw when the devfile declares no Git project and only a revision is given', () => {
      const devfile = {
        schemaVersion: '2.3.0',
        metadata: { name: 'no-git' },
        projects: [{ name: 'archive', zip: { location: 'https://example.com/archive.zip' } }],
      } as devfileApi.Devfile;

      expect(() =>
        configureProjectRemotes(devfile, undefined, false, 'my-branch', 'https://example.com'),
      ).not.toThrow();
      expect(devfile.projects?.length).toBe(1);
    });

    test('should not throw when the devfile has no projects at all and only a revision is given', () => {
      const devfile = {
        schemaVersion: '2.3.0',
        metadata: { name: 'empty' },
      } as devfileApi.Devfile;

      expect(() =>
        configureProjectRemotes(devfile, undefined, false, 'my-branch', 'https://example.com'),
      ).not.toThrow();
      expect(devfile.projects).toBeUndefined();
    });

    test('should check out from the only remote when the project has no origin', () => {
      const devfile = {
        schemaVersion: '2.3.0',
        metadata: { name: 'no-origin' },
        projects: [
          {
            name: 'no-origin',
            git: { remotes: { upstream: 'https://github.com/upstream/repo.git' } },
          },
        ],
      } as devfileApi.Devfile;

      expect(() =>
        configureProjectRemotes(devfile, undefined, false, 'my-branch', undefined),
      ).not.toThrow();
      expect(devfile.projects?.[0].git?.checkoutFrom).toStrictEqual({
        remote: 'upstream',
        revision: 'my-branch',
      });
    });
  });
});

function getHost(url: string): string {
  const match = url.match(/^(?:[a-z+]+:\/\/)?(?:[^@/]+@)?([^:/]+)/i);
  return `https://${match?.[1]}`;
}
