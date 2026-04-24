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

import { isTerminalThemeName, TERMINAL_THEMES } from '../terminal-themes';

describe('terminal-themes', () => {
  test('TERMINAL_THEMES has all expected themes', () => {
    expect(TERMINAL_THEMES).toHaveProperty('dracula');
    expect(TERMINAL_THEMES).toHaveProperty('dark');
    expect(TERMINAL_THEMES).toHaveProperty('light');
  });

  describe('isTerminalThemeName', () => {
    it.each(['dracula', 'dark', 'light'])(
      'should return true for "%s"',
      name => {
        expect(isTerminalThemeName(name)).toBe(true);
      },
    );

    it.each(['', 'invalid', 'Dracula', 'DARK', 'solarized'])(
      'should return false for "%s"',
      name => {
        expect(isTerminalThemeName(name)).toBe(false);
      },
    );
  });
});
