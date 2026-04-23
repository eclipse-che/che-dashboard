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

import {
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import React from 'react';

import { InputGroupExtended } from '@/components/InputGroupExtended';

const MAX_LENGTH = 128;

export type Props = {
  isLoading: boolean;
  value: string;
  onChange: (value: string, isValid: boolean) => void;
};
export type State = {
  validated: ValidatedOptions | undefined;
  value: string | undefined;
};

export class GitConfigUserName extends React.PureComponent<Props, State> {
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
    const result = this.validateAndSanitize(value);
    const isValid = result.validated === ValidatedOptions.success;

    this.setState({
      value,
      validated: result.validated,
    });
    this.props.onChange(value, isValid);
  }

  private validateAndSanitize(value: string): {
    validated: ValidatedOptions;
    sanitized: string;
  } {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      return {
        validated: ValidatedOptions.error,
        sanitized: 'Name is required',
      };
    }
    if (trimmed.length > MAX_LENGTH) {
      return {
        validated: ValidatedOptions.error,
        sanitized: `Name must not exceed ${MAX_LENGTH} characters`,
      };
    }

    return {
      validated: ValidatedOptions.success,
      sanitized: trimmed,
    };
  }

  public render(): React.ReactElement {
    const { isLoading } = this.props;
    const { value = '', validated } = this.state;

    const fieldId = 'gitconfig-user-name';
    const result = this.validateAndSanitize(value);

    return (
      <FormGroup label="name" fieldId={fieldId} isRequired>
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
            autoComplete="name"
            isDisabled={isLoading}
            validated={validated}
            value={value}
            onChange={(_event, value) => this.handleChange(value)}
          />
        </InputGroupExtended>
        {validated === ValidatedOptions.error && (
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant="error" icon={<ExclamationCircleIcon />}>
                {result.sanitized}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        )}
      </FormGroup>
    );
  }
}
