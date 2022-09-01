/*
 * Copyright (c) 2018-2021 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import React from 'react';
import {
  Brand,
  Card,
  CardBody,
  CardHeader,
  CardHeaderMain,
  Badge,
  CardActions,
  Dropdown,
  KebabToggle,
  DropdownPosition,
} from '@patternfly/react-core';
import './sample-card.css';
import { TargetEditor, VISIBLE_TAGS } from './SamplesListGallery';
import DropdownEditors from './DropdownEditors';

type Props = {
  metadata: che.DevfileMetaData;
  targetEditors: TargetEditor[];
  onClick: (editorId: string | undefined) => void;
};
type State = {
  isExpanded: boolean;
};

export class SampleCard extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      isExpanded: false,
    };
  }

  private getTags(): JSX.Element[] {
    const {
      metadata: { tags },
    } = this.props;

    const createTag = (text: string, key: number): React.ReactElement => {
      return (
        <Badge
          isRead
          style={{ whiteSpace: 'nowrap' }}
          key={`badge_${key}`}
          data-testid="card-badge"
        >
          {text.trim()}
        </Badge>
      );
    };

    return tags
      .filter(tag => VISIBLE_TAGS.indexOf(tag) !== -1)
      .map((item: string, index: number) => createTag(item, index));
  }

  private getEditors(): TargetEditor[] {
    const editors: TargetEditor[] = [];
    this.props.targetEditors.forEach((editor: TargetEditor) => {
      const isAdded = editors.find(e => e.name === editor.name);
      if (!isAdded) {
        editors.push(editor);
        return;
      }
      if (isAdded.isDefault || isAdded.version === 'next') {
        return;
      }
      if (editor.isDefault || editor.version === 'next' || editor.version === 'latest') {
        const existingEditorIndex = editors.indexOf(isAdded);
        editors[existingEditorIndex] = editor;
      }
    });
    return editors;
  }

  private getDropdownItems(): React.ReactNode[] {
    const targetEditors = this.getEditors();

    return [
      <DropdownEditors
        key="che-editors"
        targetEditors={targetEditors}
        onClick={(editorId: string) => {
          this.setState({ isExpanded: false });
          this.props.onClick(editorId);
        }}
      />,
    ];
  }

  render(): React.ReactElement {
    const { metadata } = this.props;
    const { isExpanded } = this.state;
    const tags = this.getTags();
    const devfileIcon = this.buildIcon(metadata);
    const dropdownItems = this.getDropdownItems();
    const onClickHandler = () => this.props.onClick(undefined);

    return (
      <Card
        isFlat
        isHoverable
        isCompact
        isSelectable
        key={metadata.links.self}
        onClick={onClickHandler}
        className={'sample-card'}
      >
        <CardHeader>
          <CardHeaderMain>{devfileIcon}</CardHeaderMain>
          <CardActions>
            {tags}
            <Dropdown
              style={{ whiteSpace: 'nowrap' }}
              onClick={e => e.stopPropagation()}
              toggle={
                <KebabToggle
                  onToggle={isExpanded => {
                    this.setState({ isExpanded });
                  }}
                />
              }
              isOpen={isExpanded}
              position={DropdownPosition.right}
              dropdownItems={dropdownItems}
              isPlain
            />
          </CardActions>
        </CardHeader>
        <CardHeader>{metadata.displayName}</CardHeader>
        <CardBody>{metadata.description}</CardBody>
      </Card>
    );
  }

  private buildIcon(metadata: che.DevfileMetaData): React.ReactElement {
    return metadata.icon ? (
      <Brand src={metadata.icon} alt={metadata.displayName} style={{ height: '64px' }} />
    ) : (
      <div className="blank-icon">
        <div className="codicon codicon-symbol-method"></div>
      </div>
    );
  }
}
