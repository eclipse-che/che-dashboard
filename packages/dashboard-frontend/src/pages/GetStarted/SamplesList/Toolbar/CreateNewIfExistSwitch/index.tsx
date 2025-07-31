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

import { Switch } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import React from 'react';

import { CheTooltip } from '@/components/CheTooltip';
import { Navigation } from '@/Layout/Navigation';

export type Props = {
  onChange: (isCreateNewIfExist: boolean) => void;
};
type State = {
  isChecked: boolean;
};

export class CreateNewIfExistSwitch extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      isChecked: Navigation.pageState?.['create-new-if-exist-switch']?.['isChecked'] !== 'false',
    };
  }

  componentDidMount() {
    this.handleChange(this.state.isChecked);
  }

  private handleChange(isChecked: boolean): void {
    Navigation.pageState['create-new-if-exist-switch'] = { isChecked: String(isChecked) };
    this.setState({ isChecked });
    this.props.onChange(isChecked);
  }

  render(): React.ReactElement {
    const { isChecked } = this.state;

    return (
      <Switch
        id="create-new-if-exist-switch"
        label={
          <div style={{ minWidth: '125px' }}>
            Create New
            <CheTooltip content="Create a new workspace each time when ON; reuse an existing one when OFF.">
              <OutlinedQuestionCircleIcon style={{ margin: '0 5px' }} />
            </CheTooltip>
          </div>
        }
        isChecked={isChecked}
        onChange={isChecked => this.handleChange(isChecked)}
      />
    );
  }
}
