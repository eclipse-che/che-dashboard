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
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  Label,
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
} from '@patternfly/react-core';
import { CheckIcon, EllipsisVIcon } from '@patternfly/react-icons';
import React from 'react';

import { buildManageKeysUrl } from '@/components/AiToolSelector/manageKeys';
import styles from '@/components/AiToolSelector/SelectorModal.module.css';
import { AiProviderDefinition, AiToolDefinition, groupToolsByProvider } from '@/services/catalog';
import { AiToolVersions, SandboxCustomization } from '@/services/sandboxFactory';

export type Props = {
  aiTools: AiToolDefinition[];
  aiProviders: AiProviderDefinition[];
  dashboardUrl: string;
  customization: SandboxCustomization;
  isDisabled?: boolean;
  onChange: (customization: SandboxCustomization) => void;
};

/**
 * The agents a sandbox will run, as a dropdown.
 *
 * The create form is where the sandbox is still being described, so the
 * agents belong in the form beside the image and the limits rather than
 * behind a pencil and a dialog: a field that is being filled in, not a
 * setting being changed. Every pick applies at once, the way the other
 * fields of the form do, and the manifest preview follows along.
 *
 * Renders nothing when the cluster publishes no AI tools - an empty control
 * only raises the question of what is missing.
 */
export function AiToolDropdown({
  aiTools,
  aiProviders,
  dashboardUrl,
  customization,
  isDisabled = false,
  onChange,
}: Props): React.ReactElement | null {
  const [isOpen, setIsOpen] = React.useState(false);
  const [openVersionsOf, setOpenVersionsOf] = React.useState<string | undefined>(undefined);

  const groups = React.useMemo(() => groupToolsByProvider(aiTools), [aiTools]);
  const selected = customization.aiProviderIds;
  const versions = React.useMemo(() => customization.aiVersions ?? {}, [customization.aiVersions]);

  const providerName = React.useCallback(
    (group: AiToolDefinition[]): string =>
      aiProviders.find(provider => provider.id === group[0].providerId)?.name ?? group[0].name,
    [aiProviders],
  );

  const effectiveTag = React.useCallback(
    (group: AiToolDefinition[]): string => versions[group[0].providerId] ?? group[0].tag,
    [versions],
  );

  const toggleText = React.useMemo(() => {
    if (selected.length === 0) {
      return 'None';
    }
    return selected
      .map(id => aiProviders.find(provider => provider.id === id)?.name ?? id)
      .join(', ');
  }, [aiProviders, selected]);

  const handleToggle = React.useCallback(
    (providerId: string) => {
      const aiProviderIds = selected.includes(providerId)
        ? selected.filter(id => id !== providerId)
        : [...selected, providerId];
      onChange({ aiProviderIds, aiVersions: versions });
    },
    [onChange, selected, versions],
  );

  const handleVersionSelect = React.useCallback(
    (event: React.MouseEvent | React.KeyboardEvent, providerId: string, tag: string) => {
      // The version sits inside the option; without this the click would also
      // tick the checkbox it is drawn on.
      event.stopPropagation();
      event.preventDefault();

      const aiVersions: AiToolVersions = { ...versions, [providerId]: tag };
      // Picking a version is how a user says they want the tool.
      const aiProviderIds = selected.includes(providerId) ? selected : [...selected, providerId];

      setOpenVersionsOf(undefined);
      onChange({ aiProviderIds, aiVersions });
    },
    [onChange, selected, versions],
  );

  if (groups.length === 0) {
    return null;
  }

  const buildVersionDropdown = (group: AiToolDefinition[]): React.ReactElement | null => {
    if (group.length <= 1) {
      return null;
    }
    const providerId = group[0].providerId;
    const activeTag = effectiveTag(group);
    const isVersionsOpen = openVersionsOf === providerId;

    return (
      <Dropdown
        toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
          <MenuToggle
            ref={toggleRef}
            variant="plain"
            style={{ padding: 0 }}
            onClick={(event: React.MouseEvent) => {
              event.stopPropagation();
              setOpenVersionsOf(isVersionsOpen ? undefined : providerId);
            }}
            isExpanded={isVersionsOpen}
            aria-label={`${group[0].name} version options`}
            icon={<EllipsisVIcon />}
          />
        )}
        isOpen={isVersionsOpen}
        onOpenChange={(open: boolean) => setOpenVersionsOf(open ? providerId : undefined)}
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

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      id="sandbox-ai-tools"
      data-testid="ai-tool-dropdown-toggle"
      isDisabled={isDisabled}
      isExpanded={isOpen}
      isFullWidth
      onClick={() => setIsOpen(!isOpen)}
    >
      {toggleText}
    </MenuToggle>
  );

  return (
    <Select
      data-testid="ai-tool-dropdown"
      isOpen={isOpen}
      selected={selected}
      // Nothing is read off the event here: which provider an option stands
      // for is already bound to the option, and the version dropdown inside
      // it reports separately.
      onOpenChange={(open: boolean) => setIsOpen(open)}
      toggle={toggle}
    >
      {/* More than one agent can run in the same sandbox, and a reader that
          is told otherwise would announce every pick as a replacement. */}
      <SelectList isAriaMultiselectable>
        {groups.map(group => {
          const providerId = group[0].providerId;
          const provider = aiProviders.find(item => item.id === providerId);

          return (
            <SelectOption
              key={providerId}
              value={providerId}
              hasCheckbox
              isSelected={selected.includes(providerId)}
              description={provider?.description}
              onClick={() => handleToggle(providerId)}
              onKeyDown={(event: React.KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleToggle(providerId);
                }
              }}
            >
              <span className={styles.checkboxLabel}>
                {providerName(group)}
                <Label variant="outline" color="blue" className={styles.versionLabel}>
                  {effectiveTag(group)}
                </Label>
                {buildVersionDropdown(group)}
              </span>
            </SelectOption>
          );
        })}
        <Divider component="li" />
        <li role="none" className={styles.manageKeys}>
          <Button
            variant="link"
            isInline
            component="a"
            href={buildManageKeysUrl(dashboardUrl)}
            target="_blank"
          >
            Manage API keys in User Preferences
          </Button>
        </li>
      </SelectList>
    </Select>
  );
}
