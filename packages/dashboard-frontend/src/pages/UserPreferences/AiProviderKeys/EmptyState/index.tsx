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
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  PageSection,
} from '@patternfly/react-core';
import { KeyIcon, PlusCircleIcon } from '@patternfly/react-icons';
import React from 'react';

export type Props = {
  isDisabled: boolean;
  hasProviders: boolean;
  onAddKey: () => void;
};

export class AiProviderKeysEmptyState extends React.PureComponent<Props> {
  public render(): React.ReactElement {
    const { isDisabled, hasProviders, onAddKey } = this.props;

    if (!hasProviders) {
      return (
        <PageSection>
          <EmptyState
            isFullHeight={true}
            variant={EmptyStateVariant.sm}
            icon={KeyIcon}
            titleText="No AI Providers Configured"
          >
            <EmptyStateBody>
              Ask your administrator to configure AI providers in the CheCluster custom resource.
            </EmptyStateBody>
          </EmptyState>
        </PageSection>
      );
    }

    return (
      <PageSection>
        <EmptyState
          isFullHeight={true}
          variant={EmptyStateVariant.sm}
          icon={KeyIcon}
          titleText="No AI Providers Keys"
        >
          <EmptyStateBody>
            <Button
              icon={<PlusCircleIcon />}
              aria-label="Add AI Provider Key"
              variant="link"
              isDisabled={isDisabled}
              onClick={() => onAddKey()}
            >
              Add AI Provider Key
            </Button>
          </EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }
}
