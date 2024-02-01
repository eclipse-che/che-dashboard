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

import {
  Dropdown,
  DropdownGroup,
  DropdownItem,
  DropdownPosition,
  KebabToggle,
} from '@patternfly/react-core';
import { CheckIcon } from '@patternfly/react-icons';
import React from 'react';

import TagLabel from '@/components/TagLabel';
import { PluginEditor } from '@/pages/GetStarted/SamplesList/Gallery';
import styles from '@/pages/GetStarted/SamplesList/Gallery/Card/DropdownEditors/index.module.css';

export type Props = {
  editors: PluginEditor[];
  onEditorSelect: (editorId: string) => void;
};

type State = {
  isExpanded: boolean;
};

export class DropdownEditors extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      isExpanded: false,
    };
  }

  private handleClick(editorId: string): void {
    this.props.onEditorSelect(editorId);
  }

  private toggleExpand(isExpanded: boolean): void {
    this.setState({ isExpanded });
  }

  private getDropdownItemGroup(): React.ReactNode[] {
    const { editors } = this.props;

    return [
      <DropdownGroup
        className={styles.dropdownEditorGroup}
        label="Choose an editor"
        key="editor-group"
      >
        {editors.map(editor => {
          return (
            <DropdownItem
              key={editor.id}
              tooltip={editor.displayName}
              onClick={() => this.handleClick(editor.id)}
              data-testid="card-action"
            >
              <span className={styles.editorTitle}>{editor.name}</span>
              <TagLabel version={editor.version} />
              {editor.isDefault && (
                <CheckIcon data-testid="checkmark" className={styles.checkIcon} />
              )}
            </DropdownItem>
          );
        })}
      </DropdownGroup>,
    ];
  }

  public render(): React.ReactElement {
    const { isExpanded } = this.state;

    const dropdownItems = this.getDropdownItemGroup();

    return (
      <Dropdown
        style={{ whiteSpace: 'nowrap' }}
        toggle={<KebabToggle onToggle={isExpanded => this.toggleExpand(isExpanded)} />}
        isOpen={isExpanded}
        position={DropdownPosition.right}
        dropdownItems={dropdownItems}
        isPlain
        data-testid="card-actions-dropdown"
        onClick={e => e.stopPropagation()}
      />
    );
  }
}
