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
import { EyeIcon, EyeSlashIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { Button, FormGroup, InputGroupText, TextInput, ValidatedOptions } from '@patternfly/react-core';

const MAX_LENGTH = 100;
const ERROR_REQUIRED_VALUE = 'A value is required.';
const ERROR_MAX_LENGTH = `The password is too long. The maximum length is ${MAX_LENGTH} characters.`;

type Props = {
  password?: string;
  onChange?: (password: string, validated: ValidatedOptions) => void;
};

type State = {
  password: string;
  isHidden: boolean;
  errorMessage?: string;
  validated: ValidatedOptions;
};

export class RegistryPasswordFormGroup extends React.PureComponent<Props, State> {

  constructor(props: Props) {
    super(props);

    const password = this.props.password || '';
    const validated = ValidatedOptions.default;
    const isHidden = true;

    this.state = { password, validated, isHidden };
  }

  public componentDidUpdate(prevProps: Props): void {
    const password = this.props.password || '';
    if (prevProps.password !== password) {
      this.setState({ password });
    }
  }

  private onChange(password: string): void {
    if (this.state.password === password) {
      return;
    }
    const { onChange } = this.props;
    const { errorMessage, validated } = this.validate(password);

    this.setState({ password, validated, errorMessage });
    if (onChange) {
      onChange(password, validated);
    }
  }

  private validate(password: string): { validated: ValidatedOptions; errorMessage?: string; } {
    if (password.length === 0) {
      return {
        errorMessage: ERROR_REQUIRED_VALUE,
        validated: ValidatedOptions.error,
      };
    } else if (password.length > MAX_LENGTH) {
      return {
        errorMessage: ERROR_MAX_LENGTH,
        validated: ValidatedOptions.error,
      };
    }

    return {
      validated: ValidatedOptions.success,
    };
  }

  public render(): React.ReactElement {
    const { password, errorMessage, validated, isHidden } = this.state;

    return (
      <FormGroup
        style={{ gridTemplateColumns: '80px', minHeight: '65px' }}
        label="Password"
        fieldId="id-password-helper"
        helperTextInvalid={errorMessage}
        isRequired={true}
        helperTextInvalidIcon={<ExclamationCircleIcon />}
        validated={validated}
      >
        <InputGroupText>
          <TextInput
            data-testid="registry-password-input"
            aria-label="Password input"
            placeholder="Enter a password"
            type={isHidden ? 'password' : 'text'}
            value={password}
            validated={validated}
            onChange={_password => this.onChange(_password)}
          />
          <Button variant="control" aria-label="show" onClick={() => this.setState({ isHidden: !isHidden })}>
            {isHidden ? (<EyeSlashIcon />) : (<EyeIcon />)}
          </Button>
        </InputGroupText>
      </FormGroup>
    );
  }

}
