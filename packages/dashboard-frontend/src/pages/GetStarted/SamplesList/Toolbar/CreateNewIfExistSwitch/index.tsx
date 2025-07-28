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
import React from 'react';

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
      isChecked: false, // Default state is unchecked
    };
  }

  private handleChange(isChecked: boolean): void {
    this.setState({ isChecked });
    this.props.onChange(isChecked);
  }

  private getLabelNode(text: string): React.ReactNode {
    return <div style={{ minWidth: '200px' }}>{text}</div>;
  }

  render(): React.ReactElement {
    const { isChecked } = this.state;
    // Using getLabelNode to ensure consistent styling
    const labelOn = this.getLabelNode('Create New If Existing On');
    const labelOff = this.getLabelNode('Create New If Existing Off');

    return (
      <Switch
        id="create-new-if-exist-switch"
        label={labelOn}
        labelOff={labelOff}
        isChecked={isChecked}
        onChange={isChecked => this.handleChange(isChecked)}
      />
    );
  }
}
