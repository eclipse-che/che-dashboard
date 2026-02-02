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
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Dropdown,
  DropdownItem,
  DropdownList,
  LabelGroup,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import { CheckIcon, EllipsisVIcon } from '@patternfly/react-icons';
import React from 'react';
import sanitizeHtml from 'sanitize-html';

import styles from '@/components/EditorSelector/Gallery/Entry/index.module.css';
import { TagLabel } from '@/components/TagLabel';
import { che } from '@/services/models';

export type Props = {
  editorsGroup: che.Plugin[];
  groupIcon: string;
  groupIconMediatype: string;
  groupName: string;
  selectedId: string;
  onSelect: (editorId: string) => void;
};
export type State = {
  activeEditor: che.Plugin;
  isKebabOpen: boolean;
  isSelectedGroup: boolean;
};

const allowedTags = ['Tech Preview', 'Deprecated'];

export class EditorSelectorEntry extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    // define if this editor group is selected
    const selectedEditor = props.editorsGroup.find(editor => editor.id === props.selectedId);
    const isSelectedGroup = selectedEditor !== undefined;

    this.state = {
      activeEditor: selectedEditor || props.editorsGroup[0],
      isKebabOpen: false,
      isSelectedGroup,
    };
  }

  private get id(): string {
    return `editor-selector-card-${this.state.activeEditor.id}`;
  }

  private get selectableActionId(): string {
    return `editor-selector-input-${this.state.activeEditor.id}`;
  }

  public componentDidUpdate(prevProps: Props): void {
    if (prevProps.selectedId !== this.props.selectedId) {
      const selectedEditor = this.props.editorsGroup.find(
        editor => editor.id === this.props.selectedId,
      );

      if (selectedEditor === undefined) {
        this.setState({
          isSelectedGroup: false,
        });
        return;
      }

      this.setState({
        activeEditor: selectedEditor,
        isSelectedGroup: true,
      });
    }
  }

  private handleSelectableAction = (): void => {
    const { selectedId, onSelect } = this.props;
    const { activeEditor } = this.state;

    if (activeEditor.id === selectedId) {
      return;
    }

    onSelect(activeEditor.id);
  };

  private handleDropdownToggle(event: React.MouseEvent) {
    event.stopPropagation();

    this.setState({ isKebabOpen: !this.state.isKebabOpen });
  }

  private handleDropdownSelect(
    event: MouseEvent | React.MouseEvent | React.KeyboardEvent,
    editor: che.Plugin,
  ) {
    event.stopPropagation();
    event.preventDefault();

    this.setState({
      activeEditor: editor,
      isKebabOpen: false,
    });

    const { selectedId, onSelect } = this.props;
    const { activeEditor } = this.state;
    if (selectedId === activeEditor.id && selectedId !== editor.id) {
      onSelect(editor.id);
    }
  }

  private buildDropdownItems(): React.ReactNode[] {
    const { editorsGroup } = this.props;
    const { activeEditor } = this.state;

    return editorsGroup.map(editor => {
      const isChecked = editor.version === activeEditor.version;
      return (
        <DropdownItem
          key={editor.id}
          onClick={event => this.handleDropdownSelect(event, editor)}
          data-testid="editor-card-action"
          aria-checked={isChecked}
          icon={isChecked ? <CheckIcon /> : undefined}
        >
          {editor.version}
        </DropdownItem>
      );
    });
  }

  public render(): React.ReactElement {
    const { groupIcon, groupIconMediatype, groupName } = this.props;
    const { isKebabOpen, isSelectedGroup, activeEditor } = this.state;

    const dropdownItems = this.buildDropdownItems();

    const titleClassName = isSelectedGroup ? styles.activeCard : '';

    const icon =
      groupIconMediatype === 'image/svg+xml'
        ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(groupIcon)}`
        : groupIcon;

    const tags = (activeEditor.tags || [])
      .map(tag => {
        const words = tag.trim().toLowerCase().replace(/-/g, ' ').split(' ');
        return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      })
      .filter(tag => allowedTags.includes(tag));
    const tagsGroup = (
      <LabelGroup isVertical>
        <TagLabel type="version" text={activeEditor.version} />
        {tags.length > 0 ? (
          tags.map(tag => <TagLabel key={tag} type="tag" text={tag} />)
        ) : (
          <span style={{ padding: '0 5px', lineHeight: '12px', visibility: 'hidden' }}>&nbsp;</span>
        )}
      </LabelGroup>
    );

    return (
      <Card id={this.id} isCompact isSelectable isSelected={isSelectedGroup}>
        <CardHeader
          selectableActions={{
            selectableActionId: this.selectableActionId,
            selectableActionAriaLabelledby: this.id,
            name: 'editor-selector',
            variant: 'single',
            onChange: this.handleSelectableAction,
            hasNoOffset: true,
            isHidden: true,
          }}
          actions={{
            actions: (
              <Dropdown
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle
                    ref={toggleRef}
                    variant="plain"
                    onClick={event => this.handleDropdownToggle(event)}
                    isExpanded={isKebabOpen}
                    aria-label={`${groupName} actions`}
                    icon={<EllipsisVIcon />}
                  />
                )}
                isOpen={isKebabOpen}
                onOpenChange={isOpen => this.setState({ isKebabOpen: isOpen })}
                popperProps={{ position: 'right' }}
              >
                <DropdownList>{dropdownItems}</DropdownList>
              </Dropdown>
            ),
          }}
        >
          <img src={icon} className={styles.editorIcon} alt={`${groupName} icon`} />
          {tagsGroup}
          <CardTitle className={titleClassName}>{groupName}</CardTitle>
        </CardHeader>
        <CardBody>{activeEditor.description}</CardBody>
        {activeEditor.provider && (
          <CardFooter>
            <div data-testid="providerInfo" className={styles.provider}>
              {React.createElement('p', {
                dangerouslySetInnerHTML: {
                  __html: sanitizeHtml(
                    activeEditor.provider.replace(
                      /\[([^\]]+)\]\(([^)]+)\)/g,
                      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
                    ),
                    {
                      allowedTags: ['a'],
                      allowedAttributes: {
                        a: ['href', 'target', 'rel'],
                      },
                      allowedSchemes: ['http', 'https'],
                    },
                  ),
                },
              })}
            </div>
          </CardFooter>
        )}
      </Card>
    );
  }
}
