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

import { api } from '@eclipse-che/common';
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
} from '@patternfly/react-core';
import { CheckIcon, EllipsisVIcon } from '@patternfly/react-icons';
import React from 'react';

import styles from '@/pages/WorkspaceDetails/OverviewTab/AiTool/SelectorModal.module.css';
import { groupToolsByProvider } from '@/services/helpers/aiTools';

export type SelectedVersions = Record<string, string>;

type Props = {
  isOpen: boolean;
  aiTools: api.AiToolDefinition[];
  aiProviders: api.AiProviderDefinition[];
  selected: string[];
  selectedVersions: SelectedVersions;
  originSelection: string[];
  originVersions: SelectedVersions;
  onToggle: (toolId: string) => void;
  onConfirm: (selectedVersions: SelectedVersions) => void;
  onCancel: () => void;
};

type State = {
  selectedVersions: SelectedVersions;
  openDropdownId: string | null;
};

export class AiToolSelectorModal extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      selectedVersions: { ...props.selectedVersions },
      openDropdownId: null,
    };
  }

  public componentDidUpdate(prevProps: Props): void {
    if (prevProps.selectedVersions !== this.props.selectedVersions) {
      this.setState({ selectedVersions: { ...this.props.selectedVersions } });
    }
  }

  private groupByProviderId(): ReturnType<typeof groupToolsByProvider> {
    return groupToolsByProvider(this.props.aiTools);
  }

  private handleVersionSelect(
    event: React.MouseEvent | React.KeyboardEvent,
    providerId: string,
    tag: string,
  ): void {
    event.stopPropagation();
    event.preventDefault();
    this.setState(prev => ({
      selectedVersions: { ...prev.selectedVersions, [providerId]: tag },
      openDropdownId: null,
    }));
    // Auto-select the tool when the user picks a version
    if (!this.props.selected.includes(providerId)) {
      this.props.onToggle(providerId);
    }
  }

  private buildVersionDropdown(toolGroup: api.AiToolDefinition[]): React.ReactElement | null {
    if (toolGroup.length <= 1) {
      return null;
    }
    const { openDropdownId, selectedVersions } = this.state;
    const providerId = toolGroup[0].providerId;
    const activeTag = selectedVersions[providerId] ?? toolGroup[0].tag;
    const isOpen = openDropdownId === providerId;

    const items = toolGroup.map(tool => (
      <DropdownItem
        key={tool.tag}
        onClick={event => this.handleVersionSelect(event, providerId, tool.tag)}
        aria-checked={tool.tag === activeTag}
        icon={tool.tag === activeTag ? <CheckIcon /> : undefined}
      >
        {tool.tag}
      </DropdownItem>
    ));

    return (
      <Dropdown
        toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
          <MenuToggle
            ref={toggleRef}
            variant="plain"
            style={{ padding: 0 }}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              this.setState({ openDropdownId: isOpen ? null : providerId });
            }}
            isExpanded={isOpen}
            aria-label={`${toolGroup[0].name} version options`}
            icon={<EllipsisVIcon />}
          />
        )}
        isOpen={isOpen}
        onOpenChange={open => this.setState({ openDropdownId: open ? providerId : null })}
        popperProps={{ position: 'right' }}
      >
        <DropdownList>{items}</DropdownList>
      </Dropdown>
    );
  }

  public render(): React.ReactNode {
    const {
      isOpen,
      aiProviders,
      selected,
      originSelection,
      originVersions,
      onToggle,
      onConfirm,
      onCancel,
    } = this.props;
    const { selectedVersions } = this.state;

    const groups = this.groupByProviderId();

    const allTools = groups.flat();
    const getEffectiveVersion = (id: string): string =>
      selectedVersions[id] ?? allTools.find(t => t.providerId === id)?.tag ?? '';

    const hasVersionChange = selected.some(id => {
      if (!originSelection.includes(id)) {
        return false; // newly added — first two conditions handle it
      }
      const newTag = getEffectiveVersion(id);
      const oldTag = originVersions[id] ?? allTools.find(t => t.providerId === id)?.tag ?? '';
      return newTag !== oldTag;
    });

    const hasChanged =
      selected.length !== originSelection.length ||
      selected.some(id => !originSelection.includes(id)) ||
      hasVersionChange;

    return (
      <Modal
        variant={ModalVariant.small}
        isOpen={isOpen}
        onClose={onCancel}
        elementToFocus="[data-pf-initial-focus]"
      >
        <ModalHeader title="Change AI Tools" />
        <ModalBody>
          <Content data-pf-initial-focus tabIndex={-1} style={{ outline: 'none' }}>
            {groups.length === 0 ? (
              <Content component="p">
                No AI tools are available. Ask your administrator to configure AI tools in the
                CheCluster custom resource.
              </Content>
            ) : (
              <>
                <Content component={ContentVariants.h6}>Select AI coding tools</Content>
                {groups.map(toolGroup => {
                  const providerId = toolGroup[0].providerId;
                  const activeTag = selectedVersions[providerId] ?? toolGroup[0].tag;
                  const provider = aiProviders.find(p => p.id === providerId);
                  const versionDropdown = this.buildVersionDropdown(toolGroup);

                  const checkboxLabel = (
                    <span className={styles.checkboxLabel}>
                      {toolGroup[0].name}
                      <Label variant="outline" color="blue" className={styles.versionLabel}>
                        {activeTag}
                      </Label>
                      {versionDropdown}
                    </span>
                  );

                  return (
                    <Content key={providerId} component={ContentVariants.h6}>
                      <Checkbox
                        label={checkboxLabel}
                        id={`ai-tool-${providerId.replace(/\//g, '-')}-checkbox`}
                        description={provider?.description}
                        isChecked={selected.includes(providerId)}
                        onChange={() => onToggle(providerId)}
                      />
                    </Content>
                  );
                })}
              </>
            )}
          </Content>
        </ModalBody>
        <ModalFooter>
          <Button
            key="confirm"
            variant="primary"
            isDisabled={!hasChanged}
            onClick={() => onConfirm(selectedVersions)}
          >
            Save
          </Button>
          <Button key="cancel" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    );
  }
}
