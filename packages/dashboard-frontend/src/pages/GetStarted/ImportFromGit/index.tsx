/*
 * Copyright (c) 2018-2024 Red Hat, Inc.
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
  Button,
  ButtonVariant,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  FormHelperText,
  FormSection,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { History } from 'history';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { FactoryLocationAdapter } from '@/services/factory-location-adapter';
import { buildUserPreferencesLocation } from '@/services/helpers/location';
import { UserPreferencesTab } from '@/services/helpers/types';
import { AppState } from '@/store';
import { selectSshKeys } from '@/store/SshKeys/selectors';
import * as WorkspacesStore from '@/store/Workspaces';

export type Props = MappedProps & {
  history: History;
};
export type State = {
  hasSshKeys: boolean;
  location: string;
  validated: ValidatedOptions;
};

class ImportFromGit extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      hasSshKeys: this.props.sshKeys.length > 0,
      validated: ValidatedOptions.default,
      location: '',
    };
  }

  private handleCreate(): void {
    const factory = new FactoryLocationAdapter(this.state.location);
    // open a new page to handle that
    window.open(`${window.location.origin}/#${factory.toString()}`, '_blank');
  }

  private handleChange(location: string): void {
    const validated = this.validate(location);
    this.setState({
      location,
      validated,
    });
  }

  private validate(location: string): ValidatedOptions {
    const isValidHttp = FactoryLocationAdapter.isHttpLocation(location);
    const isValidGitSsh = FactoryLocationAdapter.isSshLocation(location);

    if (isValidHttp === true) {
      return ValidatedOptions.success;
    }

    if (isValidGitSsh === true && this.state.hasSshKeys === true) {
      return ValidatedOptions.success;
    }

    return ValidatedOptions.error;
  }

  private getErrorMessage(location: string): string | React.ReactNode {
    const isValidGitSsh = FactoryLocationAdapter.isSshLocation(location);

    if (isValidGitSsh === true && this.state.hasSshKeys === false) {
      return (
        <FormHelperText icon={<ExclamationCircleIcon />} isHidden={false} isError={true}>
          No SSH keys found. Please add your SSH keys{' '}
          <Button variant="link" isInline onClick={() => this.openUserPreferences()}>
            here
          </Button>{' '}
          and then try again.
        </FormHelperText>
      );
    }

    return 'The URL or SSHLocation is not valid.';
  }

  private openUserPreferences(): void {
    const location = buildUserPreferencesLocation(UserPreferencesTab.SSH_KEYS);
    this.props.history.push(location);
  }

  public render() {
    const { location, validated } = this.state;

    const fieldId = 'git-repo-url';
    const buttonDisabled = location === '' || validated === ValidatedOptions.error;
    const errorMessage = this.getErrorMessage(location);

    return (
      <Form
        isHorizontal={true}
        onSubmit={e => {
          e.preventDefault();
          if (buttonDisabled === true) {
            return false;
          }
          this.handleCreate();
        }}
      >
        <FormSection title="Import from Git" titleElement="h3">
          <FormGroup
            fieldId={fieldId}
            label="Git repo URL"
            isRequired={true}
            validated={validated}
            helperTextInvalid={errorMessage}
            helperTextInvalidIcon={<ExclamationCircleIcon />}
            helperText="Import from a Git repository to create your first workspace."
          >
            <Flex>
              <FlexItem grow={{ default: 'grow' }} style={{ maxWidth: '500px' }}>
                <TextInput
                  id={fieldId}
                  aria-label="HTTPS or SSH URL"
                  placeholder="Enter HTTPS or SSH URL"
                  validated={validated}
                  onChange={value => this.handleChange(value)}
                  value={location}
                />
              </FlexItem>
              <FlexItem>
                <Button
                  id="create-and-open-button"
                  isDisabled={buttonDisabled}
                  variant={ButtonVariant.secondary}
                  onClick={() => this.handleCreate()}
                >
                  Create & Open
                </Button>
              </FlexItem>
            </Flex>
          </FormGroup>
        </FormSection>
      </Form>
    );
  }
}

const mapStateToProps = (state: AppState) => ({
  sshKeys: selectSshKeys(state),
});

const connector = connect(mapStateToProps, WorkspacesStore.actionCreators);

type MappedProps = ConnectedProps<typeof connector>;
export default connector(ImportFromGit);
