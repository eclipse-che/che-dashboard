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
  icon?: string;
  description?: string;
  isSelected: boolean;
  hasExistingKey: boolean;
  onToggle: (providerId: string) => void;
};

export class AiProviderEntry extends React.PureComponent<Props> {
  private get cardId(): string {
    return `ai-provider-card-${this.props.provider.providerId.replace(/\//g, '-')}`;
  }

  private get selectableActionId(): string {
    return `ai-provider-input-${this.props.provider.providerId.replace(/\//g, '-')}`;
  }

  private handleToggle = (): void => {
    this.props.onToggle(this.props.provider.providerId);
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

  public render(): React.ReactElement {
    const { provider, icon, description, isSelected, hasExistingKey } = this.props;

    const titleClassName = isSelected ? styles.activeCard : '';

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
        >
          <CardTitle className={titleClassName}>
            {icon && (
              <img src={icon} alt={`${provider.name} icon`} className={styles.providerIcon} />
            )}
            {provider.name}
            {provider.envVarName && hasExistingKey && (
              <Badge isRead style={{ marginLeft: '8px', bottom: '2px' }}>
                <CheckCircleIcon style={{ verticalAlign: '-.145em' }} /> Key configured
              </Badge>
            )}
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
