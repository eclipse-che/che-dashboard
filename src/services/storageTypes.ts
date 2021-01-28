/*
 * Copyright (c) 2018-2020 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

const DEFAULT_AVAILABLE_TYPES = '';

export enum StorageTypeTitle {
  async = 'Asynchronous',
  ephemeral = 'Ephemeral',
  persistent = 'Persistent',
}

export function toTitle(type: che.WorkspaceStorageType): string {
  if (!StorageTypeTitle[type]) {
    if (process.env.ENV === 'development') {
      console.error(`Unknown storage type: "${type}"`);
      return 'unknown';
    }
    throw new Error(`Unknown storage type: "${type}"`);
  }
  return StorageTypeTitle[type];
}

export function fromTitle(title: string): che.WorkspaceStorageType {
  switch (title) {
    case StorageTypeTitle.async:
      return 'async';
    case StorageTypeTitle.ephemeral:
      return 'ephemeral';
    case StorageTypeTitle.persistent:
      return 'persistent';
    default:
      throw new Error(`Cannot get storage type for given title: "${title}"`);
  }
}

export function getAvailable(settings: che.WorkspaceSettings): che.WorkspaceStorageType[] {
  if (!settings || !settings['che.workspace.storage.available_types']) {
    return DEFAULT_AVAILABLE_TYPES.split(',') as che.WorkspaceStorageType[];
  }
  const availableTypes = settings['che.workspace.storage.available_types'];
  return availableTypes.split(',') as che.WorkspaceStorageType[];
}

export function getPreferred(settings: che.WorkspaceSettings): che.WorkspaceStorageType {
  return settings['che.workspace.storage.preferred_type'] as che.WorkspaceStorageType;
}

export function typeToAttributes(type: che.WorkspaceStorageType): che.WorkspaceConfigAttributes | undefined {
  switch (type) {
    case 'persistent':
      return;
    case 'ephemeral':
      return {
        persistVolumes: 'false',
      };
    case 'async':
      return {
        asyncPersist: 'true',
        persistVolumes: 'false',
      };
  }
}

export function attributesToType(attrs: che.WorkspaceConfigAttributes | undefined): che.WorkspaceStorageType {
  if (attrs?.persistVolumes === 'false') {
    if (attrs.asyncPersist === 'true') {
      return 'async';
    }
    return 'ephemeral';
  }
  return 'persistent';
}

export function updateDevfile(devfile: che.WorkspaceDevfile, storageType: che.WorkspaceStorageType): che.WorkspaceDevfile {
  const copy = JSON.parse(JSON.stringify(devfile));
  switch (storageType) {
    case 'persistent':
      if (copy.attributes) {
        delete copy.attributes.persistVolumes;
        delete copy.attributes.asyncPersist;
        if (Object.keys(copy.attributes).length === 0) {
          delete copy.attributes;
        }
      }
      break;
    case 'ephemeral':
      if (!copy.attributes) {
        copy.attributes = {};
      }
      copy.attributes.persistVolumes = 'false';
      delete copy.attributes.asyncPersist;
      break;
    case 'async':
      if (!copy.attributes) {
        copy.attributes = {};
      }
      copy.attributes.persistVolumes = 'false';
      copy.attributes.asyncPersist = 'true';
      break;
  }
  return copy;
}
