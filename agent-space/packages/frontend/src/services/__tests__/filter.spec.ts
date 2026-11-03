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

import match from '@/services/filter';

describe('match', () => {
  it('matches the beginning of the name', () => {
    expect(match('hello-world', 'hell')).toBe(true);
  });

  it('matches a word that is not the first one', () => {
    expect(match('hello-world', 'world')).toBe(true);
  });

  it('matches every token, in any order', () => {
    expect(match('hello-world', 'world hello')).toBe(true);
    expect(match('hello-world', 'hello nothing')).toBe(false);
  });

  it('ignores the case and the surrounding blanks', () => {
    expect(match('Hello-World', '  WORLD  ')).toBe(true);
  });

  it('matches a word only from its beginning', () => {
    expect(match('hello-world', 'orld')).toBe(false);
  });

  it('matches everything on an empty search', () => {
    expect(match('hello-world', '')).toBe(true);
  });

  it('reports no match for a name that has nothing in common', () => {
    expect(match('hello-world', 'openclaw')).toBe(false);
  });
});
