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
  buildFactoryParams,
  EDITOR_ATTR,
  EXISTING_WORKSPACE_NAME,
  FACTORY_ID_IGNORE_ATTRS,
  POLICIES_CREATE_ATTR,
  STORAGE_TYPE_ATTR,
} from '@/services/helpers/factoryFlow/buildFactoryParams';

describe('buildFactoryParams', () => {
  describe('getStorageType', () => {
    it('should return undefined', () => {
      const searchParams = new URLSearchParams({
        [STORAGE_TYPE_ATTR]: 'unknown-type',
      });

      expect(buildFactoryParams(searchParams).storageType).toBeUndefined();
    });

    it('should return "per-workspace" storageType', () => {
      const searchParams = new URLSearchParams({
        [STORAGE_TYPE_ATTR]: 'per-workspace',
      });

      expect(buildFactoryParams(searchParams).storageType).toBe('per-workspace');
    });

    it('should return "ephemeral" storageType', () => {
      const searchParams = new URLSearchParams({
        [STORAGE_TYPE_ATTR]: 'ephemeral',
      });

      expect(buildFactoryParams(searchParams).storageType).toBe('ephemeral');
    });

    it('should return "per-user" storageType', () => {
      const searchParams = new URLSearchParams({
        [STORAGE_TYPE_ATTR]: 'per-user',
      });

      expect(buildFactoryParams(searchParams).storageType).toBe('per-user');
    });
  });

  describe('factoryId', () => {
    it('should return "" as a default value', () => {
      const searchParams = new URLSearchParams({});

      expect(buildFactoryParams(searchParams).factoryId).toEqual('');
    });
    it('should return factory identity', () => {
      const searchParams = new URLSearchParams({
        [EDITOR_ATTR]: 'che-incubator/che-code/latest',
        [STORAGE_TYPE_ATTR]: 'per-workspace',
      });

      expect(buildFactoryParams(searchParams).factoryId).toEqual(
        'che-editor=che-incubator/che-code/latest&storageType=per-workspace',
      );
    });
    it('should check FACTOTY_ID_IGNORE_ATTRS', () => {
      expect(FACTORY_ID_IGNORE_ATTRS).toBeDefined();
      expect(FACTORY_ID_IGNORE_ATTRS).toHaveLength(2);
      expect(FACTORY_ID_IGNORE_ATTRS).toContain(POLICIES_CREATE_ATTR);
      expect(FACTORY_ID_IGNORE_ATTRS).toContain(EXISTING_WORKSPACE_NAME);
    });
    it('should return factory identity without POLICIES_CREATE_ATTR', () => {
      const searchParams = new URLSearchParams({
        [EDITOR_ATTR]: 'che-incubator/che-code/latest',
        [POLICIES_CREATE_ATTR]: 'perclick',
        [STORAGE_TYPE_ATTR]: 'per-user',
      });

      expect(buildFactoryParams(searchParams).factoryId).toEqual(
        'che-editor=che-incubator/che-code/latest&storageType=per-user',
      );
    });
    it('should return factory identity without EXISTING_WORKSPACE_NAME attributes', () => {
      const searchParams = new URLSearchParams({
        [EDITOR_ATTR]: 'che-incubator/che-code/next',
        [STORAGE_TYPE_ATTR]: 'ephemeral',
        [EXISTING_WORKSPACE_NAME]: 'test-wrksp',
      });

      expect(buildFactoryParams(searchParams).factoryId).toEqual(
        'che-editor=che-incubator/che-code/next&storageType=ephemeral',
      );
    });
  });
});
