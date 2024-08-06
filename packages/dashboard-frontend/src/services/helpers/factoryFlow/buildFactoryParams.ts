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

import { che } from '@/services/models';

export const DEV_WORKSPACE_ATTR = 'devWorkspace';
export const EDITOR_ATTR = 'che-editor';
export const ERROR_CODE_ATTR = 'error_code';
export const FACTORY_URL_ATTR = 'url';
export const POLICIES_CREATE_ATTR = 'policies.create';
export const STORAGE_TYPE_ATTR = 'storageType';
export const REMOTES_ATTR = 'remotes';
export const IMAGE_ATTR = 'image';
export const CPU_LIMIT_ATTR = 'cpuLimit';
export const MEMORY_LIMIT_ATTR = 'memoryLimit';
export const EDITOR_IMAGE_ATTR = 'editor-image';
export const USE_DEFAULT_DEVFILE = 'useDefaultDevfile';
export const DEBUG_WORKSPACE_START = 'debugWorkspaceStart';
export const PROPAGATE_FACTORY_ATTRS = [
  'workspaceDeploymentAnnotations',
  'workspaceDeploymentLabels',
  DEV_WORKSPACE_ATTR,
  EDITOR_ATTR,
  FACTORY_URL_ATTR,
  POLICIES_CREATE_ATTR,
  STORAGE_TYPE_ATTR,
  REMOTES_ATTR,
  IMAGE_ATTR,
  CPU_LIMIT_ATTR,
  MEMORY_LIMIT_ATTR,
  EDITOR_IMAGE_ATTR,
];
export const OVERRIDE_ATTR_PREFIX = 'override.';
export const DEFAULT_POLICIES_CREATE = 'peruser';

export type FactoryParams = {
  factoryId: string;
  factoryUrl: string;
  policiesCreate: PoliciesCreate;
  sourceUrl: string;
  useDevWorkspaceResources: boolean;
  overrides: Record<string, string> | undefined;
  errorCode: ErrorCode | undefined;
  storageType: che.WorkspaceStorageType | undefined;
  cheEditor: string | undefined;
  editorImage: string | undefined;
  remotes: string | undefined;
  image: string | undefined;
  cpuLimit: string | undefined;
  memoryLimit: string | undefined;
  useDefaultDevfile: boolean;
  debugWorkspaceStart: boolean;
};

export type PoliciesCreate = 'perclick' | 'peruser';

export type ErrorCode = 'invalid_request' | 'access_denied';

export function buildFactoryParams(searchParams: URLSearchParams): FactoryParams {
  return {
    cheEditor: getEditorId(searchParams),
    editorImage: getEditorImage(searchParams),
    errorCode: getErrorCode(searchParams),
    factoryId: buildFactoryId(searchParams),
    factoryUrl: getFactoryUrl(searchParams),
    overrides: buildOverrideParams(searchParams),
    policiesCreate: getPoliciesCreate(searchParams),
    sourceUrl: getSourceUrl(searchParams),
    storageType: getStorageType(searchParams),
    remotes: getRemotes(searchParams),
    useDevWorkspaceResources: getDevworkspaceResourcesUrl(searchParams) !== undefined,
    image: getImage(searchParams),
    cpuLimit: getCpuLimit(searchParams),
    memoryLimit: getMemoryLimit(searchParams),
    useDefaultDevfile: isSafeWorkspaceStart(searchParams) !== undefined,
    debugWorkspaceStart: isDebugWorkspaceStart(searchParams) !== undefined,
  };
}

function getSourceUrl(searchParams: URLSearchParams): string {
  const devworkspaceResourcesUrl = getDevworkspaceResourcesUrl(searchParams);
  return devworkspaceResourcesUrl !== undefined
    ? devworkspaceResourcesUrl
    : getFactoryUrl(searchParams);
}

function getDevworkspaceResourcesUrl(searchParams: URLSearchParams): string | undefined {
  return searchParams.get(DEV_WORKSPACE_ATTR) === null
    ? undefined
    : (searchParams.get(DEV_WORKSPACE_ATTR) as string);
}

function getFactoryUrl(searchParams: URLSearchParams): string {
  return searchParams.get(FACTORY_URL_ATTR) || '';
}

function getPoliciesCreate(searchParams: URLSearchParams): PoliciesCreate {
  return searchParams.get(POLICIES_CREATE_ATTR) === null
    ? DEFAULT_POLICIES_CREATE
    : (searchParams.get(POLICIES_CREATE_ATTR) as PoliciesCreate);
}

function getStorageType(searchParams: URLSearchParams): che.WorkspaceStorageType | undefined {
  const storageType = searchParams.get(STORAGE_TYPE_ATTR) as che.WorkspaceStorageType;
  if (storageType === 'async' || storageType === 'ephemeral' || storageType === 'persistent') {
    return storageType;
  }
}

function getEditorId(searchParams: URLSearchParams): string | undefined {
  return searchParams.get(EDITOR_ATTR) || undefined;
}

function getEditorImage(searchParams: URLSearchParams): string | undefined {
  return searchParams.get(EDITOR_IMAGE_ATTR) || undefined;
}

function getErrorCode(searchParams: URLSearchParams): ErrorCode | undefined {
  return (searchParams.get(ERROR_CODE_ATTR) as ErrorCode) || undefined;
}

function getRemotes(searchParams: URLSearchParams): string | undefined {
  return searchParams.get(REMOTES_ATTR) || undefined;
}

function buildFactoryId(searchParams: URLSearchParams): string {
  searchParams.sort();
  const factoryParams = new window.URLSearchParams();
  searchParams.forEach((val: string, key: string) => {
    factoryParams.append(key, val);
  });

  return window.decodeURIComponent(factoryParams.toString());
}

function buildOverrideParams(searchParams: URLSearchParams): Record<string, string> | undefined {
  searchParams.sort();
  const overrideParams: Record<string, string> = {};
  searchParams.forEach((val: string, key: string) => {
    if (isOverrideAttr(key)) {
      overrideParams[key] = val;
    }
  });
  if (Object.keys(overrideParams).length === 0) {
    return;
  } else {
    return overrideParams;
  }
}

function isOverrideAttr(attr: string): attr is string {
  return attr.startsWith(OVERRIDE_ATTR_PREFIX);
}

function getImage(searchParams: URLSearchParams): string | undefined {
  return searchParams.get(IMAGE_ATTR) || undefined;
}

function getMemoryLimit(searchParams: URLSearchParams): string | undefined {
  return searchParams.get(MEMORY_LIMIT_ATTR) || undefined;
}

function getCpuLimit(searchParams: URLSearchParams): string | undefined {
  return searchParams.get(CPU_LIMIT_ATTR) || undefined;
}

function isSafeWorkspaceStart(searchParams: URLSearchParams): string | undefined {
  return searchParams.get(USE_DEFAULT_DEVFILE) === null
    ? undefined
    : (searchParams.get(USE_DEFAULT_DEVFILE) as string);
}

function isDebugWorkspaceStart(searchParams: URLSearchParams): string | undefined {
  return searchParams.get(DEBUG_WORKSPACE_START) === null
    ? undefined
    : (searchParams.get(DEBUG_WORKSPACE_START) as string);
}
