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

import { che } from '@/services/models';

export enum StorageTypeTitle {
  ephemeral = 'Ephemeral',
  'per-user' = 'Per-user',
  'per-workspace' = 'Per-workspace',
  '' = 'Not defined',
}

export function toTitle(type: che.WorkspaceStorageType): string {
  if (!StorageTypeTitle[type]) {
    throw new Error(`Unknown storage type: "${type}"`);
  }
  return StorageTypeTitle[type];
}

export function getAvailable(): che.WorkspaceStorageType[] {
  return ['per-user', 'per-workspace', 'ephemeral'];
}
