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

import { Switch } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import React from 'react';

import { CheTooltip } from '@/components/CheTooltip';
import { Navigation } from '@/Layout/Navigation';

export const CREATE_NEW_IF_EXIST_SWITCH_ID = 'create-new-if-exist-switch';

export type Props = {
  isDisabled?: boolean;
  onChange: (isCreateNewIfExist: boolean) => void;
};
type State = {
  isChecked: boolean;
};

export class CreateNewIfExistSwitch extends React.PureComponent<Props, State> {
  private readonly subscribeCallback: (isChecked: boolean | undefined) => void;
  constructor(props: Props) {
    super(props);

    const { isChecked } = Navigation.pageState[CREATE_NEW_IF_EXIST_SWITCH_ID];

    this.state = {
      isChecked: isChecked !== false, // Default to true if not set
    };

    this.subscribeCallback = (isChecked: boolean | undefined) =>
      this.handleChange(isChecked === true);
  }

  componentDidMount() {
    this.handleChange(this.state.isChecked);
    Navigation.pageState.subscribe(this.subscribeCallback, CREATE_NEW_IF_EXIST_SWITCH_ID);
  }

  componentWillUnmount() {
    Navigation.pageState.unsubscribe(this.subscribeCallback, CREATE_NEW_IF_EXIST_SWITCH_ID);
  }

  private handleChange(isChecked: boolean): void {
    this.setState({ isChecked });
    this.props.onChange(isChecked);
  }

  render(): React.ReactElement {
    const { isDisabled } = this.props;
    const { isChecked } = this.state;

    return (
      <Switch
        isDisabled={isDisabled === true}
        id={CREATE_NEW_IF_EXIST_SWITCH_ID}
        label={
          <div style={{ minWidth: '125px' }}>
            Create New
            <CheTooltip content="Create a new workspace each time when ON; reuse an existing one when OFF.">
              <OutlinedQuestionCircleIcon style={{ margin: '0 5px' }} />
            </CheTooltip>
          </div>
        }
        isChecked={isChecked || isDisabled === true}
        onChange={(_event, isChecked) => {
          this.handleChange(isChecked);
          if (Navigation.pageState[CREATE_NEW_IF_EXIST_SWITCH_ID].isChecked !== isChecked) {
            Navigation.pageState[CREATE_NEW_IF_EXIST_SWITCH_ID] = { isChecked };
          }
        }}
      />
    );
  }
}
