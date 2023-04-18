/*
 * Copyright (c) 2018-2023 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { FormGroup, TextInput, TextInputTypes, ValidatedOptions } from '@patternfly/react-core';
import React from 'react';

const INVALID_URL_ERROR = 'The URL is not valid.';
const REQUIRED_ERROR = 'This field is required.';

export type Props = {
  providerEndpoint: string | undefined;
  onChange: (providerEndpoint: string, isValid: boolean) => void;
};

export type State = {
  providerEndpoint: string | undefined;
  validated: ValidatedOptions;
};

export class GitProviderEndpoint extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    const providerEndpoint = this.props.providerEndpoint;
    const validated = ValidatedOptions.default;

    this.state = { providerEndpoint, validated };
  }

  private onChange(providerEndpoint: string): void {
    const { onChange } = this.props;
    const validated = this.validate(providerEndpoint);
    const isValid = validated === ValidatedOptions.success;

    this.setState({ providerEndpoint, validated });
    onChange(providerEndpoint, isValid);
  }

  private validate(providerEndpoint: string): ValidatedOptions {
    try {
      const url = new URL(providerEndpoint);
      return url.protocol === 'http:' || url.protocol === 'https:'
        ? ValidatedOptions.success
        : ValidatedOptions.error;
    } catch (e) {
      return ValidatedOptions.error;
    }
  }

  public render(): React.ReactElement {
    const { providerEndpoint = '', validated } = this.state;
    const errorMessage = providerEndpoint.length === 0 ? REQUIRED_ERROR : INVALID_URL_ERROR;

    return (
      <FormGroup
        label="Git Provider Endpoint"
        fieldId="git-provider-endpoint-label"
        isRequired
        helperTextInvalid={errorMessage}
        validated={validated}
      >
        <TextInput
          aria-describedby="git-provider-endpoint-label"
          aria-label="Git Provider Endpoint"
          placeholder="Enter a Git Provider Endpoint"
          onChange={providerEndpoint => this.onChange(providerEndpoint)}
          type={TextInputTypes.url}
          value={providerEndpoint}
        />
      </FormGroup>
    );
  }
}
