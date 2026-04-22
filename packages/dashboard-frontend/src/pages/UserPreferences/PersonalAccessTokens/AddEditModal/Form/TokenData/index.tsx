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
  TextInputTypes,
  ValidatedOptions,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import React from 'react';

export type Props = {
  isEdit: boolean;
  tokenData: string | undefined;
  onChange: (tokenData: string, isValid: boolean) => void;
};

export type State = {
  tokenData: string | undefined;
  validated: ValidatedOptions;
};

export class TokenData extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    const validated = ValidatedOptions.default;

    this.state = {
      tokenData: undefined,
      validated,
    };
  }

  private onChange(tokenData: string): void {
    const { onChange } = this.props;
    const validated = this.validate(tokenData);
    const isValid = validated === ValidatedOptions.success;

    this.setState({ tokenData, validated });
    onChange(btoa(tokenData), isValid);
  }

  private validate(tokenName: string): ValidatedOptions {
    if (tokenName.length === 0) {
      return ValidatedOptions.error;
    } else {
      return ValidatedOptions.success;
    }
  }

  private getErrorMessage(tokenData: string): string {
    if (tokenData.length === 0) {
      return 'Token is required.';
    }
    return '';
  }

  public render(): React.ReactElement {
    const { isEdit } = this.props;
    const { tokenData = '', validated } = this.state;
    const placeholder = isEdit ? 'Replace Token' : 'Enter a Token';
    const errorMessage = this.getErrorMessage(tokenData);
    const hasError = validated === ValidatedOptions.error;

    return (
      <FormGroup fieldId="token-data-label" isRequired label="Token">
        <TextInput
          aria-describedby="token-data-label"
          aria-label="Token"
          isRequired
          onChange={(_event, tokenData) => this.onChange(tokenData)}
          placeholder={placeholder}
          type={TextInputTypes.password}
          validated={hasError ? 'error' : 'default'}
          value={tokenData}
        />
        <FormHelperText>
          <HelperText>
            {hasError && (
              <HelperTextItem variant="error" icon={<ExclamationCircleIcon />}>
                {errorMessage}
              </HelperTextItem>
            )}
          </HelperText>
        </FormHelperText>
      </FormGroup>
    );
  }
}
