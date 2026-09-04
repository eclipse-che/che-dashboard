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
  getCurrentEditorId,
  getCurrentEditorLabel,
  groupEditorsByName,
} from '@/services/helpers/editor';
import { che } from '@/services/models';
import { constructWorkspace } from '@/services/workspace-adapter';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';

function makePlugin(
  publisher: string,
  name: string,
  version: string,
  displayName: string,
): che.Plugin {
  return {
    id: `${publisher}/${name}/${version}`,
    name,
    publisher,
    displayName,
    type: 'Che Editor',
    version,
    description: `${displayName} description`,
    icon: '<svg/>',
    iconMediatype: 'image/svg+xml',
    links: { devfile: '' },
  };
}

describe('groupEditorsByName', () => {
  it('groups plugins with the same publisher/name together', () => {
    const plugins = [
      makePlugin('che-incubator', 'che-code', 'latest', 'VS Code - Open Source'),
      makePlugin('che-incubator', 'che-code', 'insiders', 'VS Code - Open Source'),
      makePlugin('che-incubator', 'che-idea-server', 'latest', 'JetBrains IntelliJ IDEA'),
    ];
    const groups = groupEditorsByName(plugins);
    expect(groups).toHaveLength(2);
    expect(groups[0].key).toBe('che-incubator/che-code');
    expect(groups[0].displayName).toBe('VS Code - Open Source');
    expect(groups[0].versions).toHaveLength(2);
    expect(groups[1].key).toBe('che-incubator/che-idea-server');
    expect(groups[1].versions).toHaveLength(1);
  });

  it('returns an empty array for empty input', () => {
    expect(groupEditorsByName([])).toEqual([]);
  });

  it('preserves insertion order of groups', () => {
    const plugins = [
      makePlugin('che-incubator', 'che-idea-server', 'latest', 'IntelliJ IDEA'),
      makePlugin('che-incubator', 'che-code', 'latest', 'VS Code'),
    ];
    const groups = groupEditorsByName(plugins);
    expect(groups[0].key).toBe('che-incubator/che-idea-server');
    expect(groups[1].key).toBe('che-incubator/che-code');
  });

  it('falls back to plugin name when displayName is empty', () => {
    const plugin: che.Plugin = {
      ...makePlugin('che-incubator', 'che-code', 'latest', ''),
      displayName: '',
      icon: '',
      iconMediatype: '',
    };
    const groups = groupEditorsByName([plugin]);
    expect(groups[0].displayName).toBe('che-code');
    expect(groups[0].icon).toBe('');
    expect(groups[0].iconMediatype).toBe('');
  });
});

describe('getCurrentEditorId', () => {
  it('returns the annotation value when present', () => {
    const dw = new DevWorkspaceBuilder()
      .withMetadata({
        annotations: { 'che.eclipse.org/che-editor': 'che-incubator/che-code/latest' },
      })
      .build();
    const workspace = constructWorkspace(dw);
    expect(getCurrentEditorId(workspace)).toBe('che-incubator/che-code/latest');
  });

  it('returns undefined when annotation is absent', () => {
    const dw = new DevWorkspaceBuilder().build();
    const workspace = constructWorkspace(dw);
    expect(getCurrentEditorId(workspace)).toBeUndefined();
  });
});

describe('getCurrentEditorLabel', () => {
  const editors = [
    makePlugin('che-incubator', 'che-code', 'latest', 'VS Code - Open Source'),
    makePlugin('che-incubator', 'che-idea-server', 'latest', 'JetBrains IntelliJ IDEA'),
  ];

  it('returns displayName when the editor is found in the list', () => {
    const dw = new DevWorkspaceBuilder()
      .withMetadata({
        annotations: { 'che.eclipse.org/che-editor': 'che-incubator/che-code/latest' },
      })
      .build();
    const workspace = constructWorkspace(dw);
    expect(getCurrentEditorLabel(workspace, editors)).toBe('VS Code - Open Source');
  });

  it('returns the raw id when the editor is not in the list', () => {
    const dw = new DevWorkspaceBuilder()
      .withMetadata({ annotations: { 'che.eclipse.org/che-editor': 'unknown/editor/next' } })
      .build();
    const workspace = constructWorkspace(dw);
    expect(getCurrentEditorLabel(workspace, editors)).toBe('unknown/editor/next');
  });

  it('returns "Default" when annotation is absent', () => {
    const dw = new DevWorkspaceBuilder().build();
    const workspace = constructWorkspace(dw);
    expect(getCurrentEditorLabel(workspace, editors)).toBe('Default');
  });

  it('falls back to plugin name when found editor has no displayName', () => {
    const editorWithoutDisplayName: che.Plugin = {
      ...makePlugin('che-incubator', 'che-code', 'latest', ''),
      displayName: '',
    };
    const dw = new DevWorkspaceBuilder()
      .withMetadata({
        annotations: { 'che.eclipse.org/che-editor': 'che-incubator/che-code/latest' },
      })
      .build();
    const workspace = constructWorkspace(dw);
    expect(getCurrentEditorLabel(workspace, [editorWithoutDisplayName])).toBe('che-code');
  });
});
