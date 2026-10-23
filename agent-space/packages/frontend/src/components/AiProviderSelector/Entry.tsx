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
  Badge,
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
  Dropdown,
  DropdownItem,
  DropdownList,
  Label,
  LabelGroup,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import { CheckIcon, EllipsisVIcon } from '@patternfly/react-icons';
import React from 'react';

import styles from '@/components/AiProviderSelector/index.module.css';
import { AiToolDefinition } from '@/services/catalog';

export type Props = {
  /** Every tag one provider publishes; the first is the one shown by default. */
  toolGroup: AiToolDefinition[];
  icon?: string;
  description?: string;
  tags?: string[];
  activeTag?: string;
  isSelected: boolean;
  isDisabled?: boolean;
  onToggle: (providerId: string) => void;
  onVersionChange: (providerId: string, tag: string) => void;
};

function toElementId(providerId: string): string {
  return providerId.replace(/\//g, '-');
}

/**
 * One provider of the gallery, as the dashboard's AI provider selector draws
 * it: a selectable card carrying the icon, the tag, the name and whatever the
 * registry says the provider is for.
 *
 * A provider that publishes several tags gets a kebab to pick between them.
 * Picking one selects the provider too - that is what asking for a version
 * means.
 */
export function AiProviderEntry({
  toolGroup,
  icon,
  description,
  tags,
  activeTag,
  isSelected,
  isDisabled = false,
  onToggle,
  onVersionChange,
}: Props): React.ReactElement {
  const [isKebabOpen, setIsKebabOpen] = React.useState(false);

  const providerId = toolGroup[0].providerId;
  const activeTool = toolGroup.find(tool => tool.tag === activeTag) ?? toolGroup[0];
  const cardId = `ai-provider-card-${toElementId(providerId)}`;

  const handleToggle = React.useCallback(() => {
    if (!isDisabled) {
      onToggle(providerId);
    }
  }, [isDisabled, onToggle, providerId]);

  // Arrow keys walk the gallery, Enter and Space pick: a card is not a button,
  // so none of it comes for free.
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleToggle();
        return;
      }

      const gallery = event.currentTarget.parentElement;
      if (gallery === null) {
        return;
      }
      // Only the cards themselves: PatternFly gives the title inside each card
      // an id derived from the card's own, and that one takes no focus.
      const cards = Array.from(
        gallery.querySelectorAll<HTMLElement>('[id^="ai-provider-card-"][tabindex]'),
      );
      const currentIndex = cards.indexOf(event.currentTarget);
      if (currentIndex === -1) {
        return;
      }

      let nextIndex = -1;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        nextIndex = (currentIndex + 1) % cards.length;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        nextIndex = (currentIndex - 1 + cards.length) % cards.length;
      }

      if (nextIndex !== -1) {
        event.preventDefault();
        cards[nextIndex].focus();
      }
    },
    [handleToggle],
  );

  const versionDropdown =
    toolGroup.length <= 1 ? null : (
      <Dropdown
        toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
          <MenuToggle
            ref={toggleRef}
            variant="plain"
            onClick={(event: React.MouseEvent) => {
              event.stopPropagation();
              setIsKebabOpen(open => !open);
            }}
            isExpanded={isKebabOpen}
            isDisabled={isDisabled}
            aria-label={`${activeTool.name} version options`}
            icon={<EllipsisVIcon />}
          />
        )}
        isOpen={isKebabOpen}
        onOpenChange={(isOpen: boolean) => setIsKebabOpen(isOpen)}
        popperProps={{ position: 'right' }}
      >
        <DropdownList>
          {toolGroup.map(tool => (
            <DropdownItem
              key={tool.tag}
              data-testid="ai-provider-version-option"
              aria-checked={tool.tag === activeTool.tag}
              icon={tool.tag === activeTool.tag ? <CheckIcon /> : undefined}
              onClick={(event: React.MouseEvent) => {
                event.stopPropagation();
                event.preventDefault();
                setIsKebabOpen(false);
                onVersionChange(providerId, tool.tag);
              }}
            >
              {tool.tag}
            </DropdownItem>
          ))}
        </DropdownList>
      </Dropdown>
    );

  const techPreviewBadges = (tags ?? [])
    .filter(tag => tag === 'Tech-Preview')
    .map(tag => (
      <Badge isRead style={{ whiteSpace: 'nowrap' }} key={tag}>
        {tag}
      </Badge>
    ));

  return (
    <Card
      id={cardId}
      data-testid={cardId}
      isCompact
      isClickable
      isSelectable
      isDisabled={isDisabled}
      isSelected={isSelected}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <CardHeader
        selectableActions={{
          selectableActionId: `ai-provider-input-${toElementId(providerId)}`,
          selectableActionAriaLabelledby: cardId,
          name: 'ai-provider-selector',
          variant: 'multiple',
          onChange: handleToggle,
          hasNoOffset: true,
          isHidden: true,
        }}
        actions={{ actions: versionDropdown }}
      >
        {icon !== undefined && (
          <img
            src={icon}
            alt={`${activeTool.name} icon`}
            className={styles.providerIcon}
            onError={event => {
              event.currentTarget.style.display = 'none';
            }}
          />
        )}
        <LabelGroup isVertical>
          <Label className={styles.versionLabel} variant="outline" color="blue">
            {activeTool.tag}
          </Label>
        </LabelGroup>
        <CardTitle className={`${styles.cardTitle}${isSelected ? ` ${styles.activeCard}` : ''}`}>
          <div>{activeTool.name}</div>
          <span className={styles.badgeGroup}>{techPreviewBadges}</span>
        </CardTitle>
      </CardHeader>
      {description !== undefined && (
        <CardFooter>
          <div className={styles.description}>{description}</div>
        </CardFooter>
      )}
    </Card>
  );
}
