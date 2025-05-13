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

import {
  getStorageType,
  STORAGE_TYPE_ATTR,
} from '@/services/helpers/factoryFlow/buildFactoryParams';

describe('buildFactoryParams', () => {
  describe('getStorageType', () => {
    it('should return undefined', () => {
      const searchParams = new URLSearchParams({
        [STORAGE_TYPE_ATTR]: 'unknown-type',
      });

      expect(getStorageType(searchParams)).toBeUndefined();
    });

    it('should return "per-workspace" storageType', () => {
      const searchParams = new URLSearchParams({
        [STORAGE_TYPE_ATTR]: 'per-workspace',
      });

      expect(getStorageType(searchParams)).toBe('per-workspace');
    });

    it('should return "ephemeral" storageType', () => {
      const searchParams = new URLSearchParams({
        [STORAGE_TYPE_ATTR]: 'ephemeral',
      });

      expect(getStorageType(searchParams)).toBe('ephemeral');
    });

    it('should return "per-user" storageType', () => {
      const searchParams = new URLSearchParams({
        [STORAGE_TYPE_ATTR]: 'per-user',
      });

      expect(getStorageType(searchParams)).toBe('per-user');
    });
  });
});
