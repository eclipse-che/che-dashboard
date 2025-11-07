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

import { FormGroup, Switch } from '@patternfly/react-core';
import React from 'react';

import { Navigation } from '@/Layout/Navigation';
import { CREATE_NEW_IF_EXIST_SWITCH_ID } from '@/pages/GetStarted/SamplesList/Toolbar/CreateNewIfExistSwitch';

export type Props = {
  onChange: (createNewIfExisting: boolean | undefined) => void;
  createNewIfExisting: boolean | undefined;
  isHidden?: boolean;
};
export type State = {
  createNewIfExisting: boolean;
};

export class CreateNewIfExistingField extends React.PureComponent<Props, State> {
  private readonly subscribeCallback: (isChecked: boolean | undefined) => void;
  constructor(props: Props) {
    super(props);

    this.state = {
      createNewIfExisting: this.props.createNewIfExisting || false,
    };

    this.subscribeCallback = (isChecked: boolean | undefined) =>
      this.handleChange(isChecked === true);
  }

  public componentDidMount() {
    Navigation.pageState[CREATE_NEW_IF_EXIST_SWITCH_ID] = {
      isChecked: this.state.createNewIfExisting,
    };
    // Subscribe to the page state when the component is mounted
    Navigation.pageState.subscribe(this.subscribeCallback, CREATE_NEW_IF_EXIST_SWITCH_ID);
  }

  public componentWillUnmount() {
    // Unsubscribe from the page state when the component is unmounted
    Navigation.pageState.unsubscribe(this.subscribeCallback, CREATE_NEW_IF_EXIST_SWITCH_ID);
  }

  public componentDidUpdate(prevProps: Readonly<Props>): void {
    const createNewIfExisting = this.props.createNewIfExisting || false;
    if (prevProps.createNewIfExisting !== createNewIfExisting) {
      this.setState({ createNewIfExisting });
      if (Navigation.pageState[CREATE_NEW_IF_EXIST_SWITCH_ID].isChecked !== createNewIfExisting) {
        Navigation.pageState[CREATE_NEW_IF_EXIST_SWITCH_ID] = { isChecked: createNewIfExisting };
      }
    }
  }

  private handleChange(createNewIfExisting: boolean): void {
    if (createNewIfExisting === this.state.createNewIfExisting) {
      return; // No change, do nothing
    }
    this.setState({ createNewIfExisting });
    this.props.onChange(createNewIfExisting);
  }

  public render() {
    const { createNewIfExisting } = this.state;
    const display = this.props.isHidden ? 'none' : 'block';

    return (
      <FormGroup label="Create New If Existing" style={{ display }}>
        <Switch
          id="advanced-options-create-new-if-exist-switch"
          aria-label="Create New If Existing"
          isChecked={createNewIfExisting}
          onChange={value => this.handleChange(value)}
        />
      </FormGroup>
    );
  }
}
