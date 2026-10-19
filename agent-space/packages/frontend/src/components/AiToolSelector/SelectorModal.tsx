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
} from '@patternfly/react-core';
import { CheckIcon, EllipsisVIcon } from '@patternfly/react-icons';
import React from 'react';

import styles from '@/components/AiToolSelector/SelectorModal.module.css';
import { AiProviderDefinition, AiToolDefinition, groupToolsByProvider } from '@/services/catalog';
import { AiToolVersions } from '@/services/sandboxFactory';

export type Props = {
  isOpen: boolean;
  aiTools: AiToolDefinition[];
  aiProviders: AiProviderDefinition[];
  /** What is installed now; the modal opens on it and compares against it. */
  originSelection: string[];
  originVersions: AiToolVersions;
  onConfirm: (providerIds: string[], versions: AiToolVersions) => void;
  onCancel: () => void;
};

/**
 * 'Change AI Tools', the same dialog the dashboard shows for a workspace.
 *
 * One checkbox per provider, and a version dropdown beside it for the
 * providers that publish more than one tag. Save stays disabled until the
 * selection actually differs from what the sandbox carries, so an accidental
 * open costs nothing.
 */
export function AiToolSelectorModal({
  isOpen,
  aiTools,
  aiProviders,
  originSelection,
  originVersions,
  onConfirm,
  onCancel,
}: Props): React.ReactElement {
  const [selected, setSelected] = React.useState<string[]>(originSelection);
  const [versions, setVersions] = React.useState<AiToolVersions>(originVersions);
  const [openDropdownId, setOpenDropdownId] = React.useState<string | undefined>(undefined);

  // Reopening has to show what the sandbox carries now, not what was last
  // cancelled, and a save elsewhere changes it under this component.
  React.useEffect(() => {
    if (isOpen) {
      setSelected(originSelection);
      setVersions(originVersions);
      setOpenDropdownId(undefined);
    }
  }, [isOpen, originSelection, originVersions]);

  const groups = React.useMemo(() => groupToolsByProvider(aiTools), [aiTools]);

  const getProviderName = React.useCallback(
    (tool: AiToolDefinition): string =>
      aiProviders.find(provider => provider.id === tool.providerId)?.name ?? tool.name,
    [aiProviders],
  );

  const effectiveTag = React.useCallback(
    (group: AiToolDefinition[]): string => versions[group[0].providerId] ?? group[0].tag,
    [versions],
  );

  const handleToggle = React.useCallback((providerId: string) => {
    setSelected(prev =>
      prev.includes(providerId) ? prev.filter(id => id !== providerId) : [...prev, providerId],
    );
  }, []);

  const handleVersionSelect = React.useCallback(
    (event: React.MouseEvent | React.KeyboardEvent, providerId: string, tag: string) => {
      event.stopPropagation();
      event.preventDefault();
      setVersions(prev => ({ ...prev, [providerId]: tag }));
      setOpenDropdownId(undefined);
      // Picking a version is how a user says they want the tool.
      setSelected(prev => (prev.includes(providerId) ? prev : [...prev, providerId]));
    },
    [],
  );

  const hasChanged =
    selected.length !== originSelection.length ||
    selected.some(id => !originSelection.includes(id)) ||
    selected.some(id => {
      const group = groups.find(toolGroup => toolGroup[0].providerId === id);
      if (group === undefined || !originSelection.includes(id)) {
        return false;
      }
      return effectiveTag(group) !== (originVersions[id] ?? group[0].tag);
    });

  const buildVersionDropdown = (group: AiToolDefinition[]): React.ReactElement | null => {
    if (group.length <= 1) {
      return null;
    }
    const providerId = group[0].providerId;
    const activeTag = effectiveTag(group);
    const isDropdownOpen = openDropdownId === providerId;

    return (
      <Dropdown
        toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
          <MenuToggle
            ref={toggleRef}
            variant="plain"
            style={{ padding: 0 }}
            onClick={(event: React.MouseEvent) => {
              event.stopPropagation();
              setOpenDropdownId(isDropdownOpen ? undefined : providerId);
            }}
            isExpanded={isDropdownOpen}
            aria-label={`${group[0].name} version options`}
            icon={<EllipsisVIcon />}
          />
        )}
        isOpen={isDropdownOpen}
        onOpenChange={(open: boolean) => setOpenDropdownId(open ? providerId : undefined)}
        popperProps={{ position: 'right' }}
      >
        <DropdownList>
          {group.map(tool => (
            <DropdownItem
              key={tool.tag}
              onClick={event => handleVersionSelect(event, providerId, tool.tag)}
              aria-checked={tool.tag === activeTag}
              icon={tool.tag === activeTag ? <CheckIcon /> : undefined}
            >
              {tool.tag}
            </DropdownItem>
          ))}
        </DropdownList>
      </Dropdown>
    );
  };

  return (
    <Modal
      variant={ModalVariant.small}
      isOpen={isOpen}
      onClose={onCancel}
      elementToFocus="[data-pf-initial-focus]"
      data-testid="ai-tool-selector-modal"
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
              {groups.map(group => {
                const providerId = group[0].providerId;
                const provider = aiProviders.find(item => item.id === providerId);

                const checkboxLabel = (
                  <span className={styles.checkboxLabel}>
                    {getProviderName(group[0])}
                    <Label variant="outline" color="blue" className={styles.versionLabel}>
                      {effectiveTag(group)}
                    </Label>
                    {buildVersionDropdown(group)}
                  </span>
                );

                return (
                  <Content key={providerId} component={ContentVariants.h6}>
                    <Checkbox
                      label={checkboxLabel}
                      id={`ai-tool-${providerId.replace(/\//g, '-')}-checkbox`}
                      description={provider?.description}
                      isChecked={selected.includes(providerId)}
                      onChange={() => handleToggle(providerId)}
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
          onClick={() => onConfirm(selected, versions)}
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
