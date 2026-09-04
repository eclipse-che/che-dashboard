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
  Button,
  Checkbox,
  Content,
  ContentVariants,
  Dropdown,
  DropdownItem,
  DropdownList,
  Label,
  MenuToggle,
  MenuToggleElement,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  TextInput,
} from '@patternfly/react-core';
import { CheckIcon, EllipsisVIcon } from '@patternfly/react-icons';
import React from 'react';

import styles from '@/pages/WorkspaceDetails/OverviewTab/Editor/SelectorModal.module.css';
import { EditorGroup, groupEditorsByName } from '@/services/helpers/editor';
import { che } from '@/services/models';

export type Props = {
  isOpen: boolean;
  currentEditorId: string | undefined;
  editors: che.Plugin[];
  onConfirm: (editorId: string) => void;
  onClose: () => void;
};

type State = {
  selectedGroupKey: string;
  selectedVersion: string;
  openDropdownId: string | null;
  filterText: string;
};

function resolveInitialState(currentEditorId: string | undefined, groups: EditorGroup[]): State {
  if (!currentEditorId) {
    const first = groups[0];
    return {
      selectedGroupKey: first?.key ?? '',
      selectedVersion: first?.versions[0]?.version ?? '',
      openDropdownId: null,
      filterText: '',
    };
  }
  const parts = currentEditorId.split('/');
  const version = parts[parts.length - 1];
  const key = parts.slice(0, -1).join('/');
  return { selectedGroupKey: key, selectedVersion: version, openDropdownId: null, filterText: '' };
}

export class EditorSelectorModal extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    const groups = groupEditorsByName(props.editors);
    this.state = resolveInitialState(props.currentEditorId, groups);
  }

  public componentDidUpdate(prevProps: Props): void {
    if (
      prevProps.currentEditorId !== this.props.currentEditorId ||
      prevProps.editors !== this.props.editors
    ) {
      const groups = groupEditorsByName(this.props.editors);
      this.setState(resolveInitialState(this.props.currentEditorId, groups));
    }
    // Reset filter when modal closes
    if (prevProps.isOpen && !this.props.isOpen) {
      this.setState({ filterText: '' });
    }
  }

  private get selectedEditorId(): string {
    return `${this.state.selectedGroupKey}/${this.state.selectedVersion}`;
  }

  private get hasChanged(): boolean {
    return this.selectedEditorId !== (this.props.currentEditorId ?? '');
  }

  private handleSelectGroup(group: EditorGroup): void {
    this.setState({
      selectedGroupKey: group.key,
      selectedVersion: group.versions[0].version,
      openDropdownId: null,
    });
  }

  private handleVersionSelect(
    event: React.MouseEvent | React.KeyboardEvent,
    groupKey: string,
    version: string,
  ): void {
    event.stopPropagation();
    event.preventDefault();
    this.setState({ selectedVersion: version, openDropdownId: null, selectedGroupKey: groupKey });
  }

  private buildVersionDropdown(group: EditorGroup): React.ReactElement | null {
    if (group.versions.length <= 1) {
      return null;
    }
    const { openDropdownId, selectedVersion, selectedGroupKey } = this.state;
    const isOpen = openDropdownId === group.key;
    const activeVersion =
      selectedGroupKey === group.key ? selectedVersion : group.versions[0].version;

    return (
      <Dropdown
        toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
          <MenuToggle
            ref={toggleRef}
            variant="plain"
            style={{ padding: 0 }}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              this.setState({ openDropdownId: isOpen ? null : group.key });
            }}
            isExpanded={isOpen}
            aria-label={`${group.displayName} version options`}
            icon={<EllipsisVIcon />}
          />
        )}
        isOpen={isOpen}
        onOpenChange={open => this.setState({ openDropdownId: open ? group.key : null })}
        popperProps={{ appendTo: 'inline', position: 'right' }}
      >
        <DropdownList>
          {isOpen
            ? group.versions.map(v => (
                <DropdownItem
                  key={v.version}
                  onClick={event => this.handleVersionSelect(event, group.key, v.version)}
                  aria-checked={v.version === activeVersion}
                  icon={v.version === activeVersion ? <CheckIcon /> : undefined}
                >
                  {v.version}
                </DropdownItem>
              ))
            : null}
        </DropdownList>
      </Dropdown>
    );
  }

  public render(): React.ReactNode {
    const { isOpen, currentEditorId, editors, onConfirm, onClose } = this.props;
    const { selectedGroupKey, selectedVersion, filterText } = this.state;

    const groups = groupEditorsByName(editors);

    const currentGroupKey = currentEditorId
      ? currentEditorId.split('/').slice(0, -1).join('/')
      : undefined;
    const isCustomEditor =
      currentGroupKey !== undefined && !groups.some(g => g.key === currentGroupKey);

    const lowerFilter = filterText.toLowerCase();
    const filteredGroups = filterText
      ? groups.filter(
          g =>
            g.displayName.toLowerCase().includes(lowerFilter) ||
            g.versions.some(
              v =>
                v.version.toLowerCase().includes(lowerFilter) ||
                (v.description ?? '').toLowerCase().includes(lowerFilter),
            ),
        )
      : groups;

    return (
      <Modal
        variant={ModalVariant.small}
        isOpen={isOpen}
        onClose={onClose}
        elementToFocus="[data-pf-initial-focus]"
      >
        <ModalHeader title="Change Editor" />
        <ModalBody>
          <div data-pf-initial-focus tabIndex={-1} style={{ outline: 'none' }}>
            {groups.length === 0 ? (
              <Content component="p">No editors are available.</Content>
            ) : (
              <>
                <div className={styles.editorSelectHeader}>
                  <Content component={ContentVariants.h6} style={{ marginBottom: 0 }}>
                    Select editor
                  </Content>
                  <TextInput
                    type="search"
                    placeholder="Filter by"
                    value={filterText}
                    onChange={(_event, value) => this.setState({ filterText: value })}
                    aria-label="Filter editors by name"
                    className={styles.filterInput}
                  />
                </div>
                <div className={styles.editorList}>
                  {isCustomEditor && (
                    <Content component={ContentVariants.h6}>
                      <div className={styles.customEditorRow}>
                        <span>{currentEditorId}</span>
                        <Label variant="outline" color="orange" className={styles.versionLabel}>
                          custom
                        </Label>
                      </div>
                    </Content>
                  )}
                  {filteredGroups.length === 0 ? (
                    <Content component="p">No editors match the filter.</Content>
                  ) : (
                    filteredGroups.map(group => {
                      const isGroupSelected = selectedGroupKey === group.key;
                      const activeVersion = isGroupSelected
                        ? selectedVersion
                        : group.versions[0].version;
                      const versionDropdown = this.buildVersionDropdown(group);

                      const radioLabel = (
                        <span className={styles.radioLabel}>
                          {group.displayName}
                          <Label variant="outline" color="blue" className={styles.versionLabel}>
                            {activeVersion}
                          </Label>
                          {versionDropdown}
                        </span>
                      );

                      return (
                        <Content key={group.key} component={ContentVariants.h6}>
                          <Checkbox
                            label={radioLabel}
                            id={`editor-${group.key.replace(/\//g, '-')}`}
                            description={group.versions[0].description}
                            isChecked={isGroupSelected}
                            onChange={() => this.handleSelectGroup(group)}
                          />
                        </Content>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            key="confirm"
            variant="primary"
            isDisabled={!this.hasChanged}
            onClick={() => onConfirm(this.selectedEditorId)}
          >
            Save
          </Button>
          <Button key="cancel" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    );
  }
}
