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

import {
  Button,
  ButtonVariant,
  Form,
  Modal,
  ModalVariant,
  ValidatedOptions,
} from '@patternfly/react-core';
import React from 'react';
import { RegistryRow } from '../../../store/UserPreferences/types';
import { RegistryPasswordFormGroup } from '../RegistryPassword';
import { RegistryUrlFormGroup } from '../RegistryUrl';
import { RegistryUsernameFormGroup } from '../RegistryUsername';

type Props = {
  registry: RegistryRow;
  isEditMode: boolean;
  isOpen: boolean;
  onChange: (registry: RegistryRow) => void;
  onCancel: () => void;
}
type State = {
  editRegistry: RegistryRow;
  urlValidated: ValidatedOptions;
  usernameValidated: ValidatedOptions;
  passwordValidated: ValidatedOptions;
}

export default class EditRegistryModal extends React.PureComponent<Props, State> {

  constructor(props: Props) {
    super(props);

    const { registry } = this.props;

    this.state = {
      editRegistry: registry,
      urlValidated: ValidatedOptions.default,
      usernameValidated: ValidatedOptions.default,
      passwordValidated: ValidatedOptions.default,
    };
  }

  public componentDidUpdate(prevProps: Props): void {
    const { isOpen, registry } = this.props;
    if (isOpen !== prevProps.isOpen || registry.url !== prevProps.registry.url) {
      this.setState({
        editRegistry: registry,
        urlValidated: ValidatedOptions.default,
        usernameValidated: ValidatedOptions.default,
        passwordValidated: ValidatedOptions.default,
      });
    }
  }

  private handleRegistryChange(): void {
    const { onChange } = this.props;
    const { editRegistry } = this.state;
    onChange(editRegistry);
  }

  private handleUrlChange(url: string, validated: ValidatedOptions): void {
    const { editRegistry, urlValidated } = this.state;
    if (editRegistry.url !== url) {
      this.setState({
        editRegistry: Object.assign({}, editRegistry, { url }),
        urlValidated: validated,
      });
    } else if (urlValidated !== validated) {
      this.setState({
        urlValidated: validated,
      });
    }
  }

  private handleUsernameChange(username: string, validated: ValidatedOptions): void {
    const { editRegistry, usernameValidated } = this.state;
    if (editRegistry.username !== username) {
      this.setState({
        editRegistry: Object.assign({}, editRegistry, { username }),
        usernameValidated: validated,
      });
    } else if (usernameValidated !== validated) {
      this.setState({
        usernameValidated: validated,
      });
    }
  }

  private handlePasswordChange(password: string, validated: ValidatedOptions): void {
    const { editRegistry, passwordValidated } = this.state;
    if (editRegistry.password !== password) {
      this.setState({
        editRegistry: Object.assign({}, editRegistry, { password }),
        passwordValidated: validated,
      });
    } else if (passwordValidated !== validated) {
      this.setState({
        passwordValidated: validated,
      });
    }
  }

  private get isUrlChange(): boolean {
    return this.props.registry.url !== this.state.editRegistry.url;
  }

  private get isUsernameChange(): boolean {
    return this.props.registry.username !== this.state.editRegistry.username;
  }

  private get isPasswordChange(): boolean {
    return this.props.registry.password !== this.state.editRegistry.password;
  }

  private get isUrlValid(): boolean {
    const { urlValidated, editRegistry: { url } } = this.state;
    return urlValidated !== ValidatedOptions.error && url.length > 0;
  }

  private get isUsernameValid(): boolean {
    return this.state.usernameValidated !== ValidatedOptions.error;
  }

  private get isPasswordValid(): boolean {
    const { passwordValidated, editRegistry: { password } } = this.state;
    return passwordValidated !== ValidatedOptions.error && (password !== undefined && password.length > 0);
  }

  private getRegistryModalFooter(): React.ReactNode {
    const { onCancel, isEditMode } = this.props;
    const isDisabled = !(this.isUrlChange || this.isUsernameChange || this.isPasswordChange)
      || !this.isUrlValid || !this.isUsernameValid || !this.isPasswordValid;

    return (
      <React.Fragment>
        <Button variant={ButtonVariant.primary}
          isDisabled={isDisabled}
          data-testid="edit-button"
          onClick={() => this.handleRegistryChange()}>
          {isEditMode ? 'Save' : 'Add'}
        </Button>
        <Button variant={ButtonVariant.link}
          data-testid="cancel-button"
          onClick={onCancel}>
          Cancel
        </Button>
      </React.Fragment>);
  }

  public render(): React.ReactElement {
    const { isOpen, onCancel, isEditMode } = this.props;
    const { editRegistry } = this.state;

    return (
      <Modal
        title={`${isEditMode ? 'Edit' : 'Add'} Container Registry`}
        variant={ModalVariant.small}
        isOpen={isOpen}
        onClose={onCancel}
        aria-label="edit-registry-info"
        footer={this.getRegistryModalFooter()}
      >
        <Form isHorizontal onSubmit={e => e.preventDefault()}>
          <RegistryUrlFormGroup
            url={editRegistry.url}
            onChange={(url: string, validated: ValidatedOptions) => this.handleUrlChange(url, validated)}
          />
          <RegistryUsernameFormGroup
            username={editRegistry.username}
            onChange={(username: string, validated: ValidatedOptions) => this.handleUsernameChange(username, validated)}
          />
          <RegistryPasswordFormGroup
            password={editRegistry.password}
            onChange={(password: string, validated: ValidatedOptions) => this.handlePasswordChange(password, validated)}
          />
        </Form>
      </Modal>
    );
  }

}
