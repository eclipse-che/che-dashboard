/*
 * Copyright (c) 2018-2022 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { getGitRemotes, GitRemote } from '../getGitRemotes';

describe('getGitRemotes()', () => {
  it('should return remotes when two values', () => {
    const input = '{https://github.com/test1/che-dashboard}';
    const expected: GitRemote[] = [
      { name: 'origin', url: 'https://github.com/test1/che-dashboard' },
    ];
    expect(getGitRemotes(input)).toMatchObject(expected);
  });
  it('should return remote when two values', () => {
    const input =
      '{https://github.com/test1/che-dashboard, https://github.com/test2/che-dashboard}';
    const expected: GitRemote[] = [
      { name: 'origin', url: 'https://github.com/test1/che-dashboard' },
      { name: 'upstream', url: 'https://github.com/test2/che-dashboard' },
    ];
    expect(getGitRemotes(input)).toMatchObject(expected);
  });
  it('should return remotes when two values', () => {
    const input =
      '{https://github.com/test1/che-dashboard, https://github.com/test2/che-dashboard}';
    const expected: GitRemote[] = [
      { name: 'origin', url: 'https://github.com/test1/che-dashboard' },
      { name: 'upstream', url: 'https://github.com/test2/che-dashboard' },
    ];
    expect(getGitRemotes(input)).toMatchObject(expected);
  });

  it('should return remotes when multiple values', () => {
    const input =
      '{https://github.com/test1/che-dashboard, https://github.com/test2/che-dashboard, https://github.com/test/che-dashboard}';
    const expected: GitRemote[] = [
      { name: 'origin', url: 'https://github.com/test1/che-dashboard' },
      { name: 'upstream', url: 'https://github.com/test2/che-dashboard' },
      { name: 'fork1', url: 'https://github.com/test3/che-dashboard' },
    ];
    expect(getGitRemotes(input)).toMatchObject(expected);
  });

  it('should return remotes when two values with remote names are provided', () => {
    const input =
      '{{test1,https://github.com/test1/che-dashboard},{test2,https://github.com/test2/che-dashboard}}';
    const expected: GitRemote[] = [
      { name: 'test1', url: 'https://github.com/test1/che-dashboard' },
      { name: 'test2', url: 'https://github.com/test2/che-dashboard' },
    ];
    expect(getGitRemotes(input)).toMatchObject(expected);
  });

  it('should return remotes when one value with remote name is provided', () => {
    const input = '{{test1,https://github.com/test1/che-dashboard}}';
    const expected: GitRemote[] = [
      { name: 'test1', url: 'https://github.com/test1/che-dashboard' },
    ];
    expect(getGitRemotes(input)).toMatchObject(expected);
  });

  it('should return remotes when multiple values with remote names are provided', () => {
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
});
