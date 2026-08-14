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
  Badge,
  Card,
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

import styles from '@/components/AiSelector/Gallery/Entry/index.module.css';
import { TagLabel } from '@/components/TagLabel';

export type Props = {
  toolGroup: [api.AiToolDefinition, ...api.AiToolDefinition[]];
  icon?: string;
  description?: string;
  tags?: string[];
  isSelected: boolean;
  hasExistingKey: boolean;
  onToggle: (providerId: string) => void;
  onVersionChange?: (providerId: string, tag: string) => void;
};

type State = {
  activeTool: api.AiToolDefinition;
  isKebabOpen: boolean;
};

export class AiProviderEntry extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      activeTool: props.toolGroup[0],
      isKebabOpen: false,
    };
  }

  public componentDidUpdate(prevProps: Props): void {
    const prevTags = prevProps.toolGroup.map(t => t.tag).join(',');
    const nextTags = this.props.toolGroup.map(t => t.tag).join(',');
    if (prevTags !== nextTags) {
      const stillActive = this.props.toolGroup.find(t => t.tag === this.state.activeTool.tag);
      this.setState({ activeTool: stillActive ?? this.props.toolGroup[0] });
    }
  }

  private get cardId(): string {
    return `ai-provider-card-${this.state.activeTool.providerId.replace(/\//g, '-')}`;
  }

  private get selectableActionId(): string {
    return `ai-provider-input-${this.state.activeTool.providerId.replace(/\//g, '-')}`;
  }

  private handleToggle = (): void => {
    this.props.onToggle(this.state.activeTool.providerId);
  };

  private handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleToggle();
      return;
    }

    const card = event.currentTarget;
    const gallery = card.parentElement;
    if (!gallery) {
      return;
    }

    const cards = Array.from(gallery.querySelectorAll<HTMLElement>('[id^="ai-provider-card-"]'));
    const currentIndex = cards.indexOf(card);
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
  };

  private handleDropdownToggle = (event: React.MouseEvent): void => {
    event.stopPropagation();
    this.setState(prev => ({ isKebabOpen: !prev.isKebabOpen }));
  };

  private handleVersionSelect = (
    event: React.MouseEvent | React.KeyboardEvent,
    tool: api.AiToolDefinition,
  ): void => {
    event.stopPropagation();
    event.preventDefault();

    const { isSelected, onVersionChange } = this.props;
    const { activeTool } = this.state;

    this.setState({ activeTool: tool, isKebabOpen: false });

    if (isSelected && activeTool.tag !== tool.tag && onVersionChange) {
      onVersionChange(tool.providerId, tool.tag);
    }
  };

  private buildVersionDropdown(): React.ReactElement | null {
    const { toolGroup, onVersionChange } = this.props;
    if (!onVersionChange || toolGroup.length <= 1) {
      return null;
    }
    const { activeTool, isKebabOpen } = this.state;

    const items = toolGroup.map(tool => (
      <DropdownItem
        key={tool.tag}
        onClick={event => this.handleVersionSelect(event, tool)}
        data-testid="ai-provider-version-option"
        aria-checked={tool.tag === activeTool.tag}
        icon={tool.tag === activeTool.tag ? <CheckIcon /> : undefined}
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
            onClick={this.handleDropdownToggle}
            isExpanded={isKebabOpen}
            aria-label={`${activeTool.name} version options`}
            icon={<EllipsisVIcon />}
          />
        )}
        isOpen={isKebabOpen}
        onOpenChange={isOpen => this.setState({ isKebabOpen: isOpen })}
        popperProps={{ position: 'right' }}
      >
        <DropdownList>{items}</DropdownList>
      </Dropdown>
    );
  }

  private getTechPreviewBadges(): React.ReactElement[] {
    const { tags } = this.props;
    if (!tags) {
      return [];
    }
    return tags
      .filter(tag => tag === 'Tech-Preview')
      .map((tag, index) => (
        <Badge isRead style={{ whiteSpace: 'nowrap' }} key={`tag-${index}`}>
          {tag}
        </Badge>
      ));
  }

  public render(): React.ReactElement {
    const { icon, description, isSelected, hasExistingKey } = this.props;
    const { activeTool } = this.state;

    const titleClassName = `${styles.cardTitle}${isSelected ? ` ${styles.activeCard}` : ''}`;
    const techPreviewBadges = this.getTechPreviewBadges();
    const versionDropdown = this.buildVersionDropdown();

    return (
      <Card
        id={this.cardId}
        isCompact
        isClickable
        isSelectable
        isSelected={isSelected}
        onClick={this.handleToggle}
        onKeyDown={this.handleKeyDown}
        tabIndex={0}
      >
        <CardHeader
          selectableActions={{
            selectableActionId: this.selectableActionId,
            selectableActionAriaLabelledby: this.cardId,
            name: 'ai-provider-selector',
            variant: 'multiple',
            onChange: this.handleToggle,
            hasNoOffset: true,
            isHidden: true,
          }}
          actions={{ actions: versionDropdown }}
        >
          {icon && (
            <img
              src={icon}
              alt={`${activeTool.name} icon`}
              className={styles.providerIcon}
              onError={e => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <LabelGroup isVertical>
            <TagLabel type="version" text={activeTool.tag} />
          </LabelGroup>
          <CardTitle className={titleClassName}>
            <div>{activeTool.name}</div>
            <span className={styles.badgeGroup}>
              {activeTool.envVarName && hasExistingKey && (
                <Badge isRead style={{ whiteSpace: 'nowrap' }}>
                  Key configured
                </Badge>
              )}
              {techPreviewBadges}
            </span>
          </CardTitle>
        </CardHeader>
        {description && (
          <CardFooter>
            <div className={styles.description}>{description}</div>
          </CardFooter>
        )}
      </Card>
    );
  }
}
