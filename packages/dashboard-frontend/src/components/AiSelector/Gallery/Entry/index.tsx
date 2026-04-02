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
import { Badge, Card, CardFooter, CardHeader, CardTitle } from '@patternfly/react-core';
import { CheckCircleIcon } from '@patternfly/react-icons';
import React from 'react';

import styles from '@/components/AiSelector/Gallery/Entry/index.module.css';

export type Props = {
  provider: api.AiToolDefinition;
  isSelected: boolean;
  hasExistingKey: boolean;
  onSelect: (providerId: string) => void;
};

export class AiProviderEntry extends React.PureComponent<Props> {
  private get cardId(): string {
    return `ai-provider-card-${this.props.provider.id.replace(/\//g, '-')}`;
  }

  private get selectableActionId(): string {
    return `ai-provider-input-${this.props.provider.id.replace(/\//g, '-')}`;
  }

  private handleSelectableAction = (): void => {
    const { isSelected, provider, onSelect } = this.props;
    if (!isSelected) {
      onSelect(provider.id);
    }
  };

  private handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleSelectableAction();
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

  public render(): React.ReactElement {
    const { provider, isSelected, hasExistingKey } = this.props;

    const titleClassName = isSelected ? styles.activeCard : '';

    return (
      <Card
        id={this.cardId}
        isCompact
        isClickable
        isSelectable
        isSelected={isSelected}
        onClick={this.handleSelectableAction}
        onKeyDown={this.handleKeyDown}
        tabIndex={0}
      >
        <CardHeader
          selectableActions={{
            selectableActionId: this.selectableActionId,
            selectableActionAriaLabelledby: this.cardId,
            name: 'ai-provider-selector',
            variant: 'single',
            onChange: this.handleSelectableAction,
            hasNoOffset: true,
            isHidden: true,
          }}
        >
          <CardTitle className={titleClassName}>
            {provider.icon && (
              <img
                src={provider.icon}
                alt={`${provider.name} icon`}
                className={styles.providerIcon}
              />
            )}
            {provider.name}
            {provider.envVarName && hasExistingKey && (
              <Badge isRead style={{ marginLeft: '8px' }}>
                <CheckCircleIcon /> Key configured
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        {provider.description && (
          <CardFooter>
            <div className={styles.description}>{provider.description}</div>
          </CardFooter>
        )}
      </Card>
    );
  }
}
