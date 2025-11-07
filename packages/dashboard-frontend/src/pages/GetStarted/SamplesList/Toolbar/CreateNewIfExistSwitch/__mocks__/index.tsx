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

export class CreateNewIfExistSwitch extends React.PureComponent<Props> {
  private isChecked = false;

  render(): React.ReactNode {
    return (
      <div data-testid="create-new-if-exist">
        {this.isChecked ? 'Create New If Existing On' : 'Create New If Existing Off'}
        <input
          data-testid="create-new-if-exist-switch"
          type="checkbox"
          onClick={() => {
            this.isChecked = !this.isChecked;
            this.props.onChange(this.isChecked);
          }}
          name="Toggle Create New If Existing"
        />
      </div>
    );
  }
}
