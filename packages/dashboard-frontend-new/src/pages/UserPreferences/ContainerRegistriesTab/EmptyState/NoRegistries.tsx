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

import { Button, EmptyState, EmptyStateBody, EmptyStateVariant } from '@patternfly/react-core';
import { PlusCircleIcon, RegistryIcon } from '@patternfly/react-icons';
import React from 'react';

type Props = {
  onAddRegistry: () => void;
};

export default class NoRegistriesEmptyState extends React.PureComponent<Props> {
  public render(): React.ReactElement {
    return (
      <EmptyState
        isFullHeight={true}
        variant={EmptyStateVariant.sm}
        icon={RegistryIcon}
        titleText="No Container Registries"
      >
        <EmptyStateBody>
          <Button
            icon={<PlusCircleIcon />}
            aria-label="add-registry"
            variant="link"
            onClick={() => this.props.onAddRegistry()}
          >
            Add Container Registry
          </Button>
        </EmptyStateBody>
      </EmptyState>
    );
  }
}
