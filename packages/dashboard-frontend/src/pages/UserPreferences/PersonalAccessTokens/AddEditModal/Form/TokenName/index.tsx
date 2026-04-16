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

const MAX_LENGTH = 255;
const REGEXP = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/;

export type Props = {
  isEdit: boolean;
  tokenName: string | undefined;
  onChange: (tokenName: string, isValid: boolean) => void;
};

export type State = {
  tokenName: string | undefined;
  validated: ValidatedOptions;
};

export class TokenName extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    const tokenName = this.props.tokenName;
    const validated = ValidatedOptions.default;

    this.state = { tokenName, validated };
  }

  private onChange(tokenName: string): void {
    const { onChange } = this.props;
    const validated = this.validate(tokenName);
    const isValid = validated === ValidatedOptions.success;

    this.setState({ tokenName, validated });
    onChange(tokenName, isValid);
  }

  private validate(tokenName: string): ValidatedOptions {
    if (tokenName.length > MAX_LENGTH) {
      return ValidatedOptions.error;
    } else if (tokenName.length === 0) {
      return ValidatedOptions.error;
    } else if (!REGEXP.test(tokenName)) {
      return ValidatedOptions.error;
    } else {
      return ValidatedOptions.success;
    }
  }

  private getErrorMessage(tokenName: string): string {
    if (tokenName.length === 0) {
      return 'Token name is required.';
    } else if (tokenName.length > MAX_LENGTH) {
      return `Token name must be ${MAX_LENGTH} characters or less.`;
    } else if (!REGEXP.test(tokenName)) {
      return 'Invalid token name format. Must use alphanumeric characters, "-" or ".", starting and ending with an alphanumeric character.';
    }
    return '';
  }

  public render(): React.ReactElement {
    const { isEdit } = this.props;
    const { tokenName = '', validated } = this.state;

    const readOnlyAttr = isEdit ? { isReadOnly: true } : {};
    const errorMessage = this.getErrorMessage(tokenName);
    const hasError = validated === ValidatedOptions.error;

    return (
      <FormGroup fieldId="token-name-label" isRequired label="Token Name">
        <TextInput
          aria-describedby="token-name-label"
          aria-label="Token Name"
          isRequired
          onChange={(_event, tokenName) => this.onChange(tokenName)}
          placeholder="Enter a Token Name"
          type={TextInputTypes.text}
          validated={hasError ? 'error' : 'default'}
          value={tokenName}
          {...readOnlyAttr}
        />
        <FormHelperText>
          <HelperText>
            {hasError ? (
              <HelperTextItem variant="error" icon={<ExclamationCircleIcon />}>
                {errorMessage}
              </HelperTextItem>
            ) : (
              <HelperTextItem>
                Must use alphanumeric characters, &quot;-&quot; or &quot;.&quot;, starting and
                ending with an alphanumeric character.
              </HelperTextItem>
            )}
          </HelperText>
        </FormHelperText>
      </FormGroup>
    );
  }
}
