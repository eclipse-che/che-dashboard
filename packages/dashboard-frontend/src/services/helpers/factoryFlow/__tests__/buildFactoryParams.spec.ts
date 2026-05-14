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

  describe('sourceUrl', () => {
    it('should return the plain factory URL when no additional attributes are present', () => {
      const baseUrl =
        'http://localhost:8080/dashboard/api/airgap-sample/devfile/download?id=java-lombok';
      const searchParams = new URLSearchParams({
        [FACTORY_URL_ATTR]: baseUrl,
      });

      expect(buildFactoryParams(searchParams).sourceUrl).toEqual(baseUrl);
    });

    it('should return only the factory URL, not factory attributes like che-editor or storageType', () => {
      const baseUrl =
        'http://localhost:8080/dashboard/api/airgap-sample/devfile/download?id=java-lombok';
      const searchParams = new URLSearchParams({
        [FACTORY_URL_ATTR]: baseUrl,
        [EDITOR_ATTR]: 'che-incubator/che-code/latest',
        [STORAGE_TYPE_ATTR]: 'per-workspace',
      });

      // sourceUrl must not include factory orchestration params — they are not part of
      // the workspace source and would produce a wrong "Git repo URL" in the UI.
      expect(buildFactoryParams(searchParams).sourceUrl).toEqual(baseUrl);
      expect(buildFactoryParams(searchParams).sourceUrl).not.toContain('che-editor');
      expect(buildFactoryParams(searchParams).sourceUrl).not.toContain('storageType');
    });

    it('should return empty string when no factory URL is present', () => {
      const searchParams = new URLSearchParams({
        [EDITOR_ATTR]: 'che-code',
        [STORAGE_TYPE_ATTR]: 'ephemeral',
      });

      expect(buildFactoryParams(searchParams).sourceUrl).toEqual('');
    });

    it('should decode %3F and %3D in airgap sample URLs to match workspace.source format', () => {
      // When a factory URL is constructed for an airgap sample, the inner URL is
      // double-encoded in the hash: %253F becomes %3F after first URLSearchParams decode.
      // workspace.source reads the annotation via URLSearchParams again, decoding %3F→?
      // and %3D→=. sourceUrl must apply the same decoding so comparison succeeds.
      //
      // Factory hash param:  url=…download%253Fid%253Dnodejs-express
      // After searchParams.get('url'): …download%3Fid%3Dnodejs-express
      // After decodeURIComponent:      …download?id=nodejs-express   ← matches workspace.source
      const encodedUrl =
        'http://che-dashboard.eclipse-che.svc:8080/dashboard/api/airgap-sample/devfile/download%3Fid%3Dnodejs-express';
      const searchParams = new URLSearchParams({
        [FACTORY_URL_ATTR]: encodedUrl,
        [EDITOR_ATTR]: 'che-incubator/che-code/latest',
        [STORAGE_TYPE_ATTR]: 'per-user',
      });

      const result = buildFactoryParams(searchParams);

      // The decoded URL matches what workspace.source returns from the annotation
      expect(result.sourceUrl).toEqual(
        'http://che-dashboard.eclipse-che.svc:8080/dashboard/api/airgap-sample/devfile/download?id=nodejs-express',
      );
      // Factory params must NOT be appended to the source URL
      expect(result.sourceUrl).not.toContain('che-editor');
      expect(result.sourceUrl).not.toContain('storageType');
    });

    it('should not append EXISTING_WORKSPACE_NAME or other factory attrs to sourceUrl', () => {
      const baseUrl = 'http://localhost:8080/dashboard/api/airgap-sample/devfile/download?id=test';
      const searchParams = new URLSearchParams({
        [FACTORY_URL_ATTR]: baseUrl,
        [EDITOR_ATTR]: 'che-incubator/che-code/latest',
        [STORAGE_TYPE_ATTR]: 'per-workspace',
        [POLICIES_CREATE_ATTR]: 'peruser',
        [EXISTING_WORKSPACE_NAME]: 'test',
      });

      const result = buildFactoryParams(searchParams);

      expect(result.sourceUrl).toEqual(baseUrl);
      expect(result.sourceUrl).not.toContain('che-editor');
      expect(result.sourceUrl).not.toContain('storageType');
      expect(result.sourceUrl).not.toContain('policies.create');
      expect(result.sourceUrl).not.toContain('existing');
      // Other factoryParams fields are still parsed correctly
      expect(result.existing).toBe('test');
    });
  });
});
