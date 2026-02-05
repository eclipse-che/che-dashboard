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
  onAddToken: () => void;
};

export class PersonalAccessTokenEmptyState extends React.PureComponent<Props> {
  public render(): React.ReactElement {
    return (
      <PageSection>
        <EmptyState
          isFullHeight={true}
          variant={EmptyStateVariant.sm}
          icon={KeyIcon}
          titleText="No Personal Access Tokens"
        >
          <EmptyStateBody>
            <Button
              icon={<PlusCircleIcon />}
              aria-label="Add Personal Access Token"
              variant="link"
              isDisabled={this.props.isDisabled}
              onClick={() => this.props.onAddToken()}
            >
              Add Personal Access Token
            </Button>
          </EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }
}
