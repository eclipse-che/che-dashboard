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
  buildFactoryParams,
  EDITOR_ATTR,
  EXISTING_WORKSPACE_NAME,
  FACTORY_ID_IGNORE_ATTRS,
  FACTORY_URL_ATTR,
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

  describe('sourceUrl with propagated factory attributes', () => {
    it('should return plain URL when no propagated attributes present', () => {
      const baseUrl =
        'http://localhost:8080/dashboard/api/airgap-sample/devfile/download?id=java-lombok';
      const searchParams = new URLSearchParams({
        [FACTORY_URL_ATTR]: baseUrl,
      });

      expect(buildFactoryParams(searchParams).sourceUrl).toEqual(baseUrl);
    });

    it('should append propagated factory attributes to sourceUrl (real data scenario)', () => {
      const baseUrl =
        'http://localhost:8080/dashboard/api/airgap-sample/devfile/download?id=java-lombok';
      const searchParams = new URLSearchParams({
        [FACTORY_URL_ATTR]: baseUrl,
        [EDITOR_ATTR]: 'che-incubator/che-code/latest',
        [STORAGE_TYPE_ATTR]: 'per-workspace',
      });

      const result = buildFactoryParams(searchParams);

      // Should include base URL with propagated attributes in sorted order
      expect(result.sourceUrl).toEqual(
        'http://localhost:8080/dashboard/api/airgap-sample/devfile/download?id=java-lombok&che-editor=che-incubator/che-code/latest&storageType=per-workspace',
      );
    });

    it('should append multiple propagated attributes in sorted order', () => {
      const baseUrl = 'https://github.com/user/repo';
      const searchParams = new URLSearchParams({
        [FACTORY_URL_ATTR]: baseUrl,
        [STORAGE_TYPE_ATTR]: 'ephemeral',
        [EDITOR_ATTR]: 'che-code/latest',
        // Note: not using DEV_WORKSPACE_ATTR because it takes precedence as sourceUrl
        image: 'custom-image',
      });

      const result = buildFactoryParams(searchParams);

      // Attributes should be appended in sorted order
      expect(result.sourceUrl).toContain('che-editor=che-code/latest');
      expect(result.sourceUrl).toContain('image=custom-image');
      expect(result.sourceUrl).toContain('storageType=ephemeral');

      // Check that che-editor comes before storageType (alphabetically sorted)
      const cheEditorIndex = result.sourceUrl.indexOf('che-editor');
      const storageTypeIndex = result.sourceUrl.indexOf('storageType');
      expect(cheEditorIndex).toBeLessThan(storageTypeIndex);
    });

    it('should handle URL that already has query parameters', () => {
      const baseUrl = 'https://example.com/devfile?existing=param';
      const searchParams = new URLSearchParams({
        [FACTORY_URL_ATTR]: baseUrl,
        [EDITOR_ATTR]: 'che-code',
        [STORAGE_TYPE_ATTR]: 'per-user',
      });

      const result = buildFactoryParams(searchParams);

      // Should use & separator for additional params
      expect(result.sourceUrl).toContain('existing=param&');
      expect(result.sourceUrl).toContain('che-editor=che-code');
      expect(result.sourceUrl).toContain('storageType=per-user');
    });

    it('should not include FACTORY_URL_ATTR in propagated attributes', () => {
      const baseUrl = 'https://github.com/test/repo';
      const searchParams = new URLSearchParams({
        [FACTORY_URL_ATTR]: baseUrl,
        [EDITOR_ATTR]: 'che-code',
      });

      const result = buildFactoryParams(searchParams);

      // Should not duplicate the url parameter
      const urlParamCount = (result.sourceUrl.match(/url=/g) || []).length;
      expect(urlParamCount).toBe(0); // url should not appear as a parameter
      expect(result.sourceUrl).toContain('che-editor=che-code');
    });

    it('should skip propagated attributes that are not present in searchParams', () => {
      const baseUrl = 'https://gitlab.com/user/project';
      const searchParams = new URLSearchParams({
        [FACTORY_URL_ATTR]: baseUrl,
        [STORAGE_TYPE_ATTR]: 'per-workspace',
        // No che-editor, should not add it
      });

      const result = buildFactoryParams(searchParams);

      expect(result.sourceUrl).toContain('storageType=per-workspace');
      expect(result.sourceUrl).not.toContain('che-editor');
    });

    it('should return empty string when factoryUrl is empty', () => {
      const searchParams = new URLSearchParams({
        [EDITOR_ATTR]: 'che-code',
        [STORAGE_TYPE_ATTR]: 'ephemeral',
      });

      const result = buildFactoryParams(searchParams);

      expect(result.sourceUrl).toEqual('');
    });

    it('should match workspace.source format for comparison', () => {
      // This test ensures that factoryParams.sourceUrl matches the format
      // used by workspace.source getter in workspace-adapter
      const baseUrl = 'http://localhost:8080/dashboard/api/airgap-sample/devfile/download?id=test';
      const searchParams = new URLSearchParams({
        [FACTORY_URL_ATTR]: baseUrl,
        [EDITOR_ATTR]: 'che-incubator/che-code/latest',
        [STORAGE_TYPE_ATTR]: 'per-workspace',
        [POLICIES_CREATE_ATTR]: 'peruser',
        [EXISTING_WORKSPACE_NAME]: 'test', // This should NOT be included in sourceUrl
      });

      const result = buildFactoryParams(searchParams);

      // Should include propagated attrs that identify the source
      expect(result.sourceUrl).toContain('che-editor=che-incubator/che-code/latest');
      expect(result.sourceUrl).toContain('storageType=per-workspace');
      expect(result.sourceUrl).toContain('policies.create=peruser');

      // Should exclude EXISTING_WORKSPACE_NAME (flow control, not source identification)
      expect(result.sourceUrl).not.toContain('existing=test');

      // Verify the attribute is still in factoryParams but not in sourceUrl
      expect(result.existing).toBe('test');
    });
  });
});
