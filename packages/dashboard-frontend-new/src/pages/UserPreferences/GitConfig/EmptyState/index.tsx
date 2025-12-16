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

import { EmptyState, EmptyStateVariant } from '@patternfly/react-core';
import { CogIcon } from '@patternfly/react-icons';
import React from 'react';

export class GitConfigEmptyState extends React.PureComponent {
  public render(): React.ReactElement {
    return (
      <EmptyState
        isFullHeight={true}
        variant={EmptyStateVariant.sm}
        icon={CogIcon}
        titleText="No gitconfig found"
      />
    );
  }
}
