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

import { dump } from 'js-yaml';

import devfileApi from '@/services/devfileApi';
import { DEVWORKSPACE_CHE_EDITOR } from '@/services/devfileApi/devWorkspace/metadata';
import { che } from '@/services/models';
import { Workspace } from '@/services/workspace-adapter';

const sortOrder: Array<keyof devfileApi.Devfile> = [
  'schemaVersion',
  'metadata',
  'attributes',
  'projects',
  'components',
  'commands',
];

const lineWidth = 9999;

function sortKeys(
  key1: keyof (devfileApi.Devfile | devfileApi.DevWorkspace),
  key2: keyof (devfileApi.Devfile | devfileApi.DevWorkspace),
): -1 | 0 | 1 {
  const index1 = sortOrder.indexOf(key1);
  const index2 = sortOrder.indexOf(key2);
  if (index1 === -1 && index2 === -1) {
    return 0;
  }
  if (index1 === -1) {
    return 1;
  }
  if (index2 === -1) {
    return -1;
  }
  if (index1 < index2) {
    return -1;
  }
  if (index1 > index2) {
    return 1;
  }
  return 0;
}

/**
 * Provides a devfile stringify function.
 */
export default function stringify(obj: devfileApi.Devfile | devfileApi.DevWorkspace): string {
  if (!obj) {
    return '';
  }
  return dump(obj, { lineWidth, sortKeys });
}

export type EditorGroup = {
  key: string;
  displayName: string;
  icon: string;
  iconMediatype: string;
  versions: che.Plugin[];
};

const VERSION_PRIORITY: ReadonlyArray<string> = ['insiders', 'next', 'latest'];
const DEPRECATED_TAG = 'Deprecated';
const GROUP_PRIORITY = 'che-code';

export function groupEditorsByName(editors: che.Plugin[]): EditorGroup[] {
  const sorted = [...editors].sort((a, b) => {
    if (a.name === b.name) {
      const aDeprecated = a.tags?.includes(DEPRECATED_TAG) ? 1 : 0;
      const bDeprecated = b.tags?.includes(DEPRECATED_TAG) ? 1 : 0;
      if (aDeprecated !== bDeprecated) {
        return aDeprecated - bDeprecated;
      }

      const aPriority = VERSION_PRIORITY.indexOf(a.version);
      const bPriority = VERSION_PRIORITY.indexOf(b.version);
      if (aPriority !== -1 && bPriority !== -1) {
        return aPriority - bPriority;
      }
      if (aPriority !== -1) return -1;
      if (bPriority !== -1) return 1;
    }
    return a.id.localeCompare(b.id);
  });

  const map = new Map<string, EditorGroup>();
  for (const editor of sorted) {
    const key = `${editor.publisher}/${editor.name}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        displayName: editor.displayName || editor.name,
        icon: editor.icon || '',
        iconMediatype: editor.iconMediatype || '',
        versions: [],
      });
    }
    map.get(key)!.versions.push(editor);
  }

  return Array.from(map.values()).sort((a, b) => {
    const aName = a.key.split('/').pop() ?? '';
    const bName = b.key.split('/').pop() ?? '';
    if (aName.startsWith(GROUP_PRIORITY) && !bName.startsWith(GROUP_PRIORITY)) {
      return -1;
    }
    if (bName.startsWith(GROUP_PRIORITY) && !aName.startsWith(GROUP_PRIORITY)) {
      return 1;
    }
    if (aName.startsWith(GROUP_PRIORITY) && bName.startsWith(GROUP_PRIORITY)) {
      if (aName === GROUP_PRIORITY) return -1;
      if (bName === GROUP_PRIORITY) return 1;
    }
    return a.displayName.localeCompare(b.displayName);
  });
}

export function getCurrentEditorId(workspace: Workspace): string | undefined {
  return workspace.ref.metadata?.annotations?.[DEVWORKSPACE_CHE_EDITOR];
}

export function getCurrentEditorLabel(workspace: Workspace, editors: che.Plugin[]): string {
  const id = getCurrentEditorId(workspace);
  if (!id) {
    return 'Default';
  }
  const found = editors.find(e => e.id === id);
  return found ? found.displayName || found.name : id;
}
