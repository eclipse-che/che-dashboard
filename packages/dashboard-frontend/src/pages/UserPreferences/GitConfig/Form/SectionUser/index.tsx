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

import { FormSection } from '@patternfly/react-core';
import * as React from 'react';

import { GitConfigUserEmail } from '@/pages/UserPreferences/GitConfig/Form/SectionUser/Email';
import { GitConfigUserName } from '@/pages/UserPreferences/GitConfig/Form/SectionUser/Name';
import { GitConfig } from '@/store/GitConfig';

export type Props = {
  config: GitConfig;
  isLoading: boolean;
  onChange: (gitConfig: GitConfig, isValid: boolean) => void;
};

export class GitConfigSectionUser extends React.PureComponent<Props> {
  private isNameValid = true;
  private isEmailValid = true;

  private handleChange(
    partialConfigUser: Partial<GitConfig['user']>,
    fieldName: 'name' | 'email',
    isValid: boolean,
  ): void {
    const { config, onChange } = this.props;

    // Update the validation state synchronously
    if (fieldName === 'name') {
      this.isNameValid = isValid;
    } else {
      this.isEmailValid = isValid;
    }

    const isFormValid = this.isNameValid && this.isEmailValid;

    onChange(
      {
        ...config,
        user: {
          ...config.user,
          ...partialConfigUser,
        },
      },
      isFormValid,
    );
  }

  public render(): React.ReactElement {
    const { config, isLoading } = this.props;
    return (
      <FormSection title="[user]" label="user">
        <GitConfigUserName
          isLoading={isLoading}
          value={config.user.name}
          onChange={(name, isValid) => this.handleChange({ name }, 'name', isValid)}
        />
        <GitConfigUserEmail
          isLoading={isLoading}
          value={config.user.email}
          onChange={(email, isValid) => this.handleChange({ email }, 'email', isValid)}
        />
      </FormSection>
    );
  }
}
