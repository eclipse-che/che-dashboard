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
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  ValidatedOptions,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import * as ini from 'multi-ini';
import React from 'react';

import { GitConfigImport } from '@/pages/UserPreferences/GitConfig/GitConfigImport';
import * as GitConfigStore from '@/store/GitConfig';

const MAX_LENGTH = 4096;
export const MAX_LENGTH_ERROR = `The value is too long. The maximum length is ${MAX_LENGTH} characters.`;
export const WRONG_TYPE_ERROR = 'This file type is not supported.';
export const PARSE_ERROR =
  'Unable to parse the Git configuration. Please ensure it is a valid .gitconfig file.';
export const USER_SECTION_MISSING_ERROR =
  'The [user] section with "name" and "email" fields is required.';
export const USER_NAME_REQUIRED_ERROR = 'Username is required.';
export const USER_NAME_LENGTH_ERROR = `User name must be between 1 and ${128} characters.`;
export const USER_EMAIL_REQUIRED_ERROR = `User email is required.`;
export const USER_EMAIL_LENGTH_ERROR = `User email must be between 1 and ${128} characters.`;
export const USER_EMAIL_FORMAT_ERROR =
  'User email must be a valid email address (e.g., user@example.com).';

// Validation constants for user fields
const USER_NAME_MAX_LENGTH = 128;
const USER_EMAIL_MAX_LENGTH = 128;
const USER_EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export type Props = {
  gitConfig: GitConfigStore.GitConfig | undefined;
  onChange: (gitConfig: GitConfigStore.GitConfig, isValid: boolean) => void;
};

export type State = {
  isUpload: boolean;
  gitConfig: GitConfigStore.GitConfig | undefined;
  gitConfigStr: string | undefined;
  validated: ValidatedOptions;
  errorMessage: string | undefined;
};

export class GitConfigForm extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      isUpload: false,
      gitConfig: undefined,
      gitConfigStr: undefined,
      validated: ValidatedOptions.default,
      errorMessage: undefined,
    };
  }

  public componentDidMount() {
    const { gitConfig } = this.props;
    const gitConfigStr = this.stringifyGitConfig(gitConfig);
    if (gitConfigStr !== undefined) {
      this.onChange(gitConfigStr, false);
    }
  }

  public shouldComponentUpdate(nextProps: Readonly<Props>, nextState: Readonly<State>): boolean {
    const { gitConfig, validated, errorMessage } = this.state;
    const {
      gitConfig: nextGitConfig,
      validated: nextValidated,
      errorMessage: nextErrorMessage,
    } = nextState;

    return (
      gitConfig !== nextGitConfig ||
      validated !== nextValidated ||
      errorMessage !== nextErrorMessage
    );
  }

  private parseGitConfig(gitConfigStr: string): GitConfigStore.GitConfig {
    const parser = new ini.Parser();
    const gitConfigLines = gitConfigStr.split(/\r?\n/);
    const gitConfig = parser.parse(gitConfigLines);
    return gitConfig as GitConfigStore.GitConfig;
  }

  private stringifyGitConfig(gitConfig: GitConfigStore.GitConfig | undefined): string | undefined {
    if (gitConfig === undefined) {
      return undefined;
    }
    const serializer = new ini.Serializer();
    return serializer
      .serialize(gitConfig)
      .replace(/\n/g, '\n    ')
      .replace(/ {4}\[/g, '[');
  }

  private onChange(gitConfigStr: string, isUpload: boolean): void {
    const { onChange } = this.props;

    // Check for max length first
    if (gitConfigStr && gitConfigStr.length > MAX_LENGTH) {
      this.setState({
        gitConfigStr,
        validated: ValidatedOptions.error,
        errorMessage: MAX_LENGTH_ERROR,
        isUpload,
      });
      return;
    }

    try {
      const gitConfig = this.parseGitConfig(gitConfigStr);
      const { validated, errorMessage } = this.validate(gitConfig);
      const isValid = validated === ValidatedOptions.success;

      this.setState({ gitConfigStr, gitConfig, validated, errorMessage, isUpload });
      onChange(gitConfig, isValid);
    } catch (error) {
      console.log(error);
      this.setState({
        validated: ValidatedOptions.error,
        errorMessage: isUpload ? WRONG_TYPE_ERROR : PARSE_ERROR,
        isUpload,
      });
    }
  }

  private validate(gitConfig: GitConfigStore.GitConfig): {
    validated: ValidatedOptions;
    errorMessage: string | undefined;
  } {
    const config = gitConfig as GitConfigStore.GitConfig;

    // Check if user section exists
    if (!config.user || (!config.user.email && !config.user.name)) {
      return {
        validated: ValidatedOptions.error,
        errorMessage: USER_SECTION_MISSING_ERROR,
      };
    }

    // Validate name
    const name = config.user.name;
    if (!name || name.length === 0) {
      return {
        validated: ValidatedOptions.error,
        errorMessage: USER_NAME_REQUIRED_ERROR,
      };
    }
    if (name.length > USER_NAME_MAX_LENGTH) {
      return {
        validated: ValidatedOptions.error,
        errorMessage: USER_NAME_LENGTH_ERROR,
      };
    }

    // Validate email
    const email = config.user.email;
    if (!email || email.length === 0) {
      return {
        validated: ValidatedOptions.error,
        errorMessage: USER_EMAIL_REQUIRED_ERROR,
      };
    }
    if (email.length > USER_EMAIL_MAX_LENGTH) {
      return {
        validated: ValidatedOptions.error,
        errorMessage: USER_EMAIL_LENGTH_ERROR,
      };
    }
    if (!USER_EMAIL_REGEX.test(email)) {
      return {
        validated: ValidatedOptions.error,
        errorMessage: USER_EMAIL_FORMAT_ERROR,
      };
    }

    return {
      validated: ValidatedOptions.success,
      errorMessage: undefined,
    };
  }

  public render(): React.ReactElement {
    const { validated, errorMessage } = this.state;

    const content = this.stringifyGitConfig(this.props.gitConfig);

    return (
      <Form onSubmit={e => e.preventDefault()}>
        <FormGroup fieldId="gitconfig" label="gitconfig">
          <GitConfigImport
            content={content}
            validated={validated}
            errorMessage={errorMessage}
            onChange={(gitConfig, isUpload) => this.onChange(gitConfig, isUpload)}
          />
          {validated === ValidatedOptions.error && errorMessage && (
            <FormHelperText>
              <HelperText>
                <HelperTextItem icon={<ExclamationCircleIcon />} variant="error">
                  {errorMessage}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          )}
        </FormGroup>
      </Form>
    );
  }
}
