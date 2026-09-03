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

export function groupEditorsByName(editors: che.Plugin[]): EditorGroup[] {
  const map = new Map<string, EditorGroup>();
  for (const editor of editors) {
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
  return Array.from(map.values());
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
  return found ? `${found.displayName || found.name} · ${found.version}` : id;
}
