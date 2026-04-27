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

export type Props = {
  providerOrganization: string | undefined;
  onChange: (providerOrganization: string, isValid: boolean) => void;
};

export type State = {
  providerOrganization: string | undefined;
  validated: ValidatedOptions;
};

export class GitProviderOrganization extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    const providerOrganization = this.props.providerOrganization;
    const validated = ValidatedOptions.default;

    this.state = { providerOrganization, validated };
  }

  private onChange(providerOrganization: string): void {
    const { onChange } = this.props;
    const validated = this.validate(providerOrganization);
    const isValid = validated === ValidatedOptions.success;

    this.setState({ providerOrganization, validated });
    onChange(providerOrganization, isValid);
  }

  private validate(providerOrganization: string): ValidatedOptions {
    if (providerOrganization.length > MAX_LENGTH) {
      return ValidatedOptions.error;
    } else if (providerOrganization.length === 0) {
      return ValidatedOptions.error;
    } else {
      return ValidatedOptions.success;
    }
  }

  private getErrorMessage(providerOrganization: string): string {
    if (providerOrganization.length === 0) {
      return 'Git Provider Organization is required.';
    } else if (providerOrganization.length > MAX_LENGTH) {
      return `Git Provider Organization must be ${MAX_LENGTH} characters or less.`;
    }
    return '';
  }

  public render(): React.ReactElement {
    const { providerOrganization = '', validated } = this.state;

    const errorMessage = this.getErrorMessage(providerOrganization);
    const hasError = validated === ValidatedOptions.error;

    return (
      <FormGroup
        label="Git Provider Organization"
        fieldId="git-provider-organization-label"
        isRequired
      >
        <TextInput
          aria-describedby="git-provider-organization-label"
          aria-label="Git Provider Organization"
          placeholder="Enter a Git Provider Organization"
          onChange={(_event, providerOrganization) => this.onChange(providerOrganization)}
          type={TextInputTypes.text}
          validated={hasError ? 'error' : 'default'}
          value={providerOrganization}
        />
        {hasError && (
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant="error" icon={<ExclamationCircleIcon />}>
                {errorMessage}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        )}
      </FormGroup>
    );
  }
}
