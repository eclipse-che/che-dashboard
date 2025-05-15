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

import { ServerConfigState } from '@/store/ServerConfig';
import { getPvcStrategy, isSourceAllowed } from '@/store/ServerConfig/helpers';

describe('helpers', () => {
  describe('isAllowedSourceUrl', () => {
    test('allowed urls', () => {
      expect(isSourceAllowed(['https://a/*'], 'https://a/b/c')).toBe(true);
      expect(isSourceAllowed(['https://a/*/c'], 'https://a/b/c')).toBe(true);
      expect(isSourceAllowed(['https://a/b/c'], 'https://a/b/c')).toBe(true);
      expect(isSourceAllowed(['*'], 'https://a/b/c/')).toBe(true);
      expect(isSourceAllowed(undefined, 'https://a/b/c')).toBe(true);
      expect(isSourceAllowed([], 'https://a/b/c')).toBe(true);
    });

    test('disallowed urls', () => {
      expect(isSourceAllowed(['https://a'], 'https://a/b/c/')).toBe(false);
    });
  });
  describe('getPvcStrategy', () => {
    const getMockState = (pvcStrategy: string) =>
      ({
        config: {
          defaults: {
            pvcStrategy,
          },
        },
      }) as Partial<ServerConfigState>;
    test('per-user', () => {
      const state = getMockState('per-user');

      const pvcStrategy = getPvcStrategy(state);

      expect(pvcStrategy).toBe('per-user');
    });
    test('per-workspace', () => {
      const state = getMockState('per-workspace');

      const pvcStrategy = getPvcStrategy(state);

      expect(pvcStrategy).toBe('per-workspace');
    });
    test('ephemeral', () => {
      const state = getMockState('ephemeral');

      const pvcStrategy = getPvcStrategy(state);

      expect(pvcStrategy).toBe('ephemeral');
    });
    test('common', () => {
      const state = getMockState('common');

      const pvcStrategy = getPvcStrategy(state);

      expect(pvcStrategy).toBe('per-user');
    });
    test('unknown', () => {
      const state = getMockState('unknown');

      const pvcStrategy = getPvcStrategy(state);

      expect(pvcStrategy).toBe('');
    });
  });
});
