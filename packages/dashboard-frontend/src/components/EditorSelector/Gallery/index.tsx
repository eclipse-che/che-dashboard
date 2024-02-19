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

import { Gallery } from '@patternfly/react-core';
import React from 'react';

import { EditorSelectorEntry } from '@/components/EditorSelector/Gallery/Entry';
import { che } from '@/services/models';

export type Props = {
  editors: che.Plugin[];
  selectedEditorId: string;
  onSelect: (editorId: string) => void;
};
export type State = {
  sortedEditorsByName: Map<string, che.Plugin[]>;
};

export class EditorGallery extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      sortedEditorsByName: new Map<string, che.Plugin[]>(),
    };
  }

  public componentDidMount(): void {
    this.init();
  }

  private init(): void {
    const { editors } = this.props;

    const versionPriority = ['insider', 'next', 'latest'];
    const sortedEditors = editors.sort((a, b) => {
      if (a.name === b.name) {
        const aPriority = versionPriority.indexOf(a.version);
        const bPriority = versionPriority.indexOf(b.version);

        if (aPriority !== -1 || bPriority !== -1) {
          return aPriority - bPriority;
        }
      }

      return a.id.localeCompare(b.id);
    });

    const sortedEditorsByName = new Map<string, che.Plugin[]>();

    sortedEditors.forEach(editor => {
      const name = editor.name;
      if (!sortedEditorsByName.has(name)) {
        sortedEditorsByName.set(name, []);
      }
      sortedEditorsByName.get(name)?.push(editor);
    });

    this.setState({
      sortedEditorsByName,
    });
  }

  private handleEditorSelect(editorId: string): void {
    this.props.onSelect(editorId);
  }

  private buildEditorCards(): React.ReactNode[] {
    const { selectedEditorId } = this.props;
    const { sortedEditorsByName } = this.state;

    return Array.from(sortedEditorsByName.keys()).map(editorName => {
      // editors same name, different version
      const editorsGroup = sortedEditorsByName.get(editorName);

      if (editorsGroup === undefined) {
        return;
      }

      const groupIcon = editorsGroup[0].icon;
      const groupName = editorsGroup[0].displayName || editorsGroup[0].name;

      return (
        <EditorSelectorEntry
          key={editorName}
          editorsGroup={editorsGroup}
          groupIcon={groupIcon}
          groupName={groupName}
          selectedId={selectedEditorId}
          onSelect={editorId => this.handleEditorSelect(editorId)}
        />
      );
    });
  }

  public render() {
    return (
      <Gallery hasGutter={true} minWidths={{ default: '170px' }} maxWidths={{ default: '170px' }}>
        {this.buildEditorCards()}
      </Gallery>
    );
  }
}
