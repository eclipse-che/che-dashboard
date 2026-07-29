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

import { load } from 'js-yaml';

import { DEVFILE_FALLBACK } from '@/pages/DevfilesList/const';

describe('DEVFILE_FALLBACK', () => {
  test('should be a non-empty string', () => {
    expect(typeof DEVFILE_FALLBACK).toBe('string');
    expect(DEVFILE_FALLBACK.length).toBeGreaterThan(0);
  });

  test('should be valid YAML', () => {
    expect(() => load(DEVFILE_FALLBACK)).not.toThrow();
  });

  test('should contain schemaVersion', () => {
    expect(DEVFILE_FALLBACK).toContain('schemaVersion');
  });

  test('should parse to an object with schemaVersion field', () => {
    const parsed = load(DEVFILE_FALLBACK) as Record<string, unknown>;
    expect(parsed).toBeDefined();
    expect(parsed.schemaVersion).toBeDefined();
    expect(typeof parsed.schemaVersion).toBe('string');
  });

  test('should contain metadata section', () => {
    expect(DEVFILE_FALLBACK).toContain('metadata');
  });
});
