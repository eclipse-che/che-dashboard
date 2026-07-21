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

import React from 'react';

import { Props } from '..';

export class DeviceAuthTokensList extends React.PureComponent<Props> {
  render() {
    const { tokens, onDeleteTokens } = this.props;

    const entries = tokens.map(token => (
      <div key={token.name} data-testid="device-auth-token-entry">
        {token.name}
        <button data-testid="delete-row-button" onClick={() => onDeleteTokens([token])}>
          Delete
        </button>
      </div>
    ));

    return <div>{entries}</div>;
  }
}
