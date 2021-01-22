/*
 * Copyright (c) 2018-2020 Red Hat, Inc.
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
import { FormGroup, TextInput, ValidatedOptions } from '@patternfly/react-core';

const MAX_LENGTH = 100;
const ERROR_MAX_LENGTH = `The username is too long. The maximum length is ${MAX_LENGTH} characters.`;

type Props = {
  username?: string;
  onChange?: (username: string, validated: ValidatedOptions) => void;
};

type State = {
  errorMessage?: string;
  username: string;
  validated: ValidatedOptions;
};

export class RegistryUsernameFormGroup extends React.PureComponent<Props, State> {

  constructor(props: Props) {
    super(props);

    const username = this.props.username || '';
    const validated = ValidatedOptions.default;

    this.state = { username, validated };
  }

  public componentDidUpdate(prevProps: Props): void {
    const username = this.props.username || '';
    if (prevProps.username !== username) {
      this.setState({ username });
    }
  }

  private onChange(username: string): void {
    if (this.state.username === username) {
      return;
    }
    const { onChange } = this.props;
    const { errorMessage, validated } = this.validate(username);

    this.setState({ username, validated, errorMessage });
    if (onChange) {
      onChange(username, validated);
    }
  }

  private validate(username: string): { validated: ValidatedOptions; errorMessage?: string; } {
    if (username.length > MAX_LENGTH) {
      return {
        errorMessage: ERROR_MAX_LENGTH,
        validated: ValidatedOptions.error,
      };
    }

    return {
      errorMessage: undefined,
      validated: ValidatedOptions.success,
    };
  }

  public render(): React.ReactElement {
    const { username, errorMessage, validated } = this.state;

    return (
      <FormGroup
        style={{ gridTemplateColumns: '80px', minHeight: '65px' }}
        label="Username"
        fieldId="id-username-helper"
        helperTextInvalid={errorMessage}
        validated={validated}
      >
        <TextInput
          aria-label="Username input"
          placeholder="Enter a username"
          value={username}
          validated={validated}
          onChange={_username => this.onChange(_username)}
        />
      </FormGroup>
    );
  }

}
