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

import { Architecture } from '@eclipse-che/common';
import { Gallery } from '@patternfly/react-core';
import React from 'react';

import { EditorSelectorEntry } from '@/components/EditorSelector/Gallery/Entry';
import { che } from '@/services/models';

export type Props = {
  defaultEditorId: string;
  editors: che.Plugin[];
  currentArchitecture: Architecture;
  selectedEditorId: string | undefined;
  editorsVisibilityConfig: { showDeprecated: boolean; hideById: string[] } | undefined;
  onSelect: (editorId: string) => void;
};
export type State = {
  selectedId: string;
  sortedEditorsByName: Map<string, che.Plugin[]>;
};

export class EditorGallery extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      selectedId: '', // will be set on component mount
      sortedEditorsByName: new Map<string, che.Plugin[]>(),
    };
  }

  public componentDidMount(): void {
    this.init();
  }

  public componentDidUpdate(prevProps: Readonly<Props>): void {
    if (prevProps.selectedEditorId !== this.props.selectedEditorId) {
      this.init();
    }
  }

  private init(): void {
    const {
      editorsVisibilityConfig,
      defaultEditorId,
      editors,
      currentArchitecture,
      selectedEditorId,
      onSelect,
    } = this.props;
    // filter and sort editors
    const filteredEditors = filterEditors(editors, currentArchitecture, editorsVisibilityConfig);
    const sortedEditors = sortEditors(filteredEditors);

    const sortedEditorsByName = new Map<string, che.Plugin[]>();

    let defaultEditor: che.Plugin | undefined;
    let selectedEditor: che.Plugin | undefined;
    sortedEditors.forEach(editor => {
      const name = editor.name;
      if (!sortedEditorsByName.has(name)) {
        sortedEditorsByName.set(name, []);
      }
      sortedEditorsByName.get(name)?.push(editor);

      // find the default editor
      if (editor.id === defaultEditorId) {
        defaultEditor = editor;
      }
      // find the selected editor
      if (editor.id === selectedEditorId) {
        selectedEditor = editor;
      }
    });

    let selectedId: string = '';
    if (selectedEditor !== undefined) {
      selectedId = selectedEditor.id;
    } else {
      if (defaultEditor !== undefined) {
        selectedId = defaultEditor.id;
      } else if (sortedEditors.length > 0) {
        // if no default editor is set, select the first editor from the sorted list
        selectedId = sortedEditors[0].id;
      }
      onSelect(selectedId);
    }

    this.setState({
      selectedId,
      sortedEditorsByName,
    });
  }

  private handleEditorSelect(editorId: string): void {
    this.props.onSelect(editorId);
  }

  private buildEditorCards(): React.ReactNode[] {
    const { selectedId, sortedEditorsByName } = this.state;

    return Array.from(sortedEditorsByName.keys()).map(editorName => {
      // editors same name, different version
      const editorsGroup = sortedEditorsByName.get(editorName);

      /* c8 ignore next 3 */
      if (editorsGroup === undefined) {
        return;
      }

      const groupIconMediatype = editorsGroup[0].iconMediatype || '';
      const groupIcon = editorsGroup[0].icon;
      const groupName = editorsGroup[0].displayName || editorsGroup[0].name;

      return (
        <EditorSelectorEntry
          key={editorName}
          editorsGroup={editorsGroup}
          groupIcon={groupIcon}
          groupIconMediatype={groupIconMediatype}
          groupName={groupName}
          selectedId={selectedId}
          onSelect={editorId => this.handleEditorSelect(editorId)}
        />
      );
    });
  }

  public render() {
    return (
      <Gallery hasGutter={true} minWidths={{ default: '210px' }} maxWidths={{ default: '210px' }}>
        {this.buildEditorCards()}
      </Gallery>
    );
  }
}

const VERSION_PRIORITY: ReadonlyArray<string> = ['insiders', 'next', 'latest'];
const DEPRECATED_TAG = 'Deprecated';

export function filterEditors(
  editors: che.Plugin[],
  currentArchitecture: Architecture,
  editorsVisibilityConfig: { showDeprecated: boolean; hideById: string[] } | undefined,
) {
  return editors.filter(editor => {
    if (!editor.arch || editor.arch.indexOf(currentArchitecture) === -1) {
      return false; // Skip if editor does not support the current architecture
    }

    if (!editorsVisibilityConfig?.showDeprecated && editor.tags?.includes(DEPRECATED_TAG)) {
      return false;
    }

    const hideById = editorsVisibilityConfig?.hideById || [];
    if (hideById.includes(editor.id)) {
      return false;
    }

    return true;
  });
}

export function sortEditors(editors: che.Plugin[]) {
  if (editors.length === 0) {
    return editors; // No editors to sort
  }
  const sorted = editors
    .sort((a, b) => {
      if (a.name === b.name) {
        const aPriority = VERSION_PRIORITY.indexOf(a.version);
        const bPriority = VERSION_PRIORITY.indexOf(b.version);

        if (aPriority !== -1 && bPriority !== -1) {
          return aPriority - bPriority;
        } else if (aPriority !== -1) {
          return -1;
        } else if (bPriority !== -1) {
          return 1;
        }
      }

      return a.id.localeCompare(b.id);
    })
    .sort((a, b) => {
      if (a.name === b.name) {
        const aPriority = a.tags?.includes(DEPRECATED_TAG) ? -1 : 1;
        const bPriority = b.tags?.includes(DEPRECATED_TAG) ? -1 : 1;

        if (aPriority !== -1 && bPriority !== -1) {
          return 0;
        } else if (aPriority !== -1) {
          return -1;
        } else if (bPriority !== -1) {
          return 1;
        }
      }

      return a.id.localeCompare(b.id);
    });

  return sorted;
}
