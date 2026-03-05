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

import { FormGroup, TextInput, ValidatedOptions } from '@patternfly/react-core';
import React from 'react';

import { InputGroupExtended } from '@/components/InputGroupExtended';

const MAX_LENGTH = 128;
const REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export type Props = {
  isLoading: boolean;
  value: string;
  onChange: (value: string, isValid: boolean) => void;
};
export type State = {
  validated: ValidatedOptions | undefined;
  value: string | undefined;
};

export class GitConfigUserEmail extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      validated: ValidatedOptions.default,
      value: props.value,
    };
  }

  public componentDidUpdate(_prevProps: Readonly<Props>, prevState: Readonly<State>): void {
    if (prevState.value === this.state.value && this.props.value !== this.state.value) {
      // reset the initial value
      this.setState({
        value: this.props.value,
        validated: ValidatedOptions.default,
      });
    }
  }

  private handleChange(value: string): void {
    const validate = this.validate(value);
    const isValid = validate === ValidatedOptions.success;

    this.setState({
      value,
      validated: validate,
    });
    this.props.onChange(value, isValid);
  }

  private validate(value: string): ValidatedOptions {
    if (value.length === 0) {
      return ValidatedOptions.error;
    }
    if (value.length > MAX_LENGTH) {
      return ValidatedOptions.error;
    }
    if (!REGEX.test(value)) {
      return ValidatedOptions.error;
    }
    return ValidatedOptions.success;
  }

  public render(): React.ReactElement {
    const { isLoading } = this.props;
    const { value = '', validated } = this.state;

    const fieldId = 'gitconfig-user-email';

    return (
      <FormGroup label="email" fieldId={fieldId} isRequired>
        <InputGroupExtended
          isLoading={isLoading}
          readonly={false}
          required={true}
          validated={validated}
          value={value}
          onRemove={undefined}
        >
          <TextInput
            id={fieldId}
            isDisabled={isLoading}
            validated={validated}
            value={value}
            onChange={(_event, value) => this.handleChange(value)}
          />
        </InputGroupExtended>
      </FormGroup>
    );
  }
}
