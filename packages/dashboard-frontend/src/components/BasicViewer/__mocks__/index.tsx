/*
 * Copyright (c) 2018-2024 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import React from 'react';

import { Props } from '@/components/BasicViewer';

export class BasicViewer extends React.PureComponent<Props> {
  public render(): React.ReactNode {
    const { id, value } = this.props;

    return (
      <div>
        Mock Basic Viewer
        <span data-testid="basic-viewer-id">{id}</span>
        <span data-testid="basic-viewer-value">{value}</span>
      </div>
    );
  }
}
