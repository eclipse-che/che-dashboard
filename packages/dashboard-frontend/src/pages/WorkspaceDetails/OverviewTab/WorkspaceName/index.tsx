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

import { ApplicationId } from '@eclipse-che/common';
import {
  Button,
  FormGroup,
  Modal,
  ModalVariant,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import {
  ExclamationCircleIcon,
  ExternalLinkSquareAltIcon,
  PencilAltIcon,
} from '@patternfly/react-icons';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { CheTooltip } from '@/components/CheTooltip';
import overviewStyles from '@/pages/WorkspaceDetails/OverviewTab/index.module.css';
import styles from '@/pages/WorkspaceDetails/OverviewTab/WorkspaceName/index.module.css';
import { Workspace, WorkspaceAdapter } from '@/services/workspace-adapter';
import { RootState } from '@/store';
import { bannerAlertActionCreators } from '@/store/BannerAlert';
import { selectApplications } from '@/store/ClusterInfo/selectors';
import { selectAllWorkspaces } from '@/store/Workspaces';

const MAX_LENGTH = 63;
const ERROR_EMPTY_NAME = 'The name cannot be empty.';
const ERROR_MAX_LENGTH = 'The name is not valid.';
const ERROR_TOOLTIP_MAX_LENGTH = `The maximum length is ${MAX_LENGTH} characters.`;
const PATTERN = `^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$`;
const ERROR_PATTERN_MISMATCH = 'The name is not valid.';
const ERROR_TOOLTIP_PATTERN_MISMATCH =
  'The name is invalid. It can contain only digits, latin letters, scores, underscores. It must start and end with a letter or digit and cannot include special characters such as spaces or symbols (e.g., $, @, #, etc.).';
const ERROR_PATTERN_EXISTING_NAME = 'The name is already in use.';
const ERROR_TOOLTIP_PATTERN_EXISTING_NAME =
  'The name is already in use. Please choose another name.';

type Props = MappedProps & {
  workspace: Workspace;
  readonly: boolean;
  onSave: (workspaceName: string) => void;
};

type State = {
  isEditModalOpen: boolean;
  editedName: string;
  validated: ValidatedOptions;
  errorMessage?: string;
  errorTooltipMessage?: string;
};

class WorkspaceNameFormGroup extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      isEditModalOpen: false,
      editedName: props.workspace.name,
      validated: ValidatedOptions.default,
      errorMessage: undefined,
      errorTooltipMessage: undefined,
    };
  }

  private handleEditToggle(isEditModalOpen: boolean): void {
    if (isEditModalOpen) {
      const { validated, errorMessage, errorTooltipMessage } = this.validate(
        this.props.workspace.name,
      );
      this.setState({
        isEditModalOpen,
        editedName: this.props.workspace.name,
        validated,
        errorMessage,
        errorTooltipMessage,
      });
    } else {
      this.setState({ isEditModalOpen });
    }
  }

  private handleNameChange(editedName: string): void {
    const { validated, errorMessage, errorTooltipMessage } = this.validate(editedName);
    this.setState({ editedName, validated, errorMessage, errorTooltipMessage });
  }

  private validate(name: string): {
    errorMessage: string | undefined;
    errorTooltipMessage: string | undefined;
    validated: ValidatedOptions;
  } {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      return {
        errorMessage: ERROR_EMPTY_NAME,
        errorTooltipMessage: undefined,
        validated: ValidatedOptions.error,
      };
    } else if (trimmedName.length > MAX_LENGTH) {
      return {
        errorMessage: ERROR_MAX_LENGTH,
        errorTooltipMessage: ERROR_TOOLTIP_MAX_LENGTH,
        validated: ValidatedOptions.error,
      };
    }
    // Check if name already exists in other workspaces
    if (
      this.props.allWorkspaces.some(
        w =>
          w.uid !== this.props.workspace.uid &&
          (trimmedName === w.name || trimmedName === w.ref.metadata.name),
      )
    ) {
      return {
        errorMessage: ERROR_PATTERN_EXISTING_NAME,
        errorTooltipMessage: ERROR_TOOLTIP_PATTERN_EXISTING_NAME,
        validated: ValidatedOptions.error,
      };
    }
    if (!new RegExp(PATTERN).test(trimmedName)) {
      return {
        errorMessage: ERROR_PATTERN_MISMATCH,
        errorTooltipMessage: ERROR_TOOLTIP_PATTERN_MISMATCH,
        validated: ValidatedOptions.error,
      };
    }

    return {
      errorMessage: undefined,
      errorTooltipMessage: undefined,
      validated: ValidatedOptions.success,
    };
  }

  private handleSaveChanges(): void {
    const { editedName, validated } = this.state;
    if (validated !== ValidatedOptions.error && editedName.trim()) {
      this.props.onSave(editedName.trim());
      this.setState({ isEditModalOpen: false });
    }
  }

  private handleCancelChanges(): void {
    this.setState({
      isEditModalOpen: false,
      editedName: this.props.workspace.name,
      validated: ValidatedOptions.default,
      errorMessage: undefined,
      errorTooltipMessage: undefined,
    });
  }

  private buildOpenShiftConsoleLink(): React.ReactElement | undefined {
    const { applications, workspace } = this.props;
    const clusterConsole = applications.find(app => app.id === ApplicationId.CLUSTER_CONSOLE);

    if (!clusterConsole) {
      return;
    }

    const devWorkspaceOpenShiftConsoleUrl = WorkspaceAdapter.buildClusterConsoleUrl(
      workspace.ref,
      clusterConsole.url,
    );

    return (
      <Button
        component="a"
        variant="link"
        href={devWorkspaceOpenShiftConsoleUrl}
        target="_blank"
        icon={<ExternalLinkSquareAltIcon />}
        iconPosition="right"
        isInline
      >
        {workspace.name}
      </Button>
    );
  }

  private getHelperTextInvalid(): React.ReactNode {
    const { validated, errorMessage, errorTooltipMessage } = this.state;

    if (validated !== ValidatedOptions.error) {
      return undefined;
    }

    if (errorTooltipMessage) {
      return (
        <CheTooltip content={errorTooltipMessage}>
          <div className={styles.helperTextInvalid}>{errorMessage}</div>
        </CheTooltip>
      );
    }

    return <div className={styles.helperTextInvalid}>{errorMessage}</div>;
  }

  private getEditModal(): React.ReactNode {
    const { isEditModalOpen, editedName, validated } = this.state;
    const { workspace } = this.props;
    const trimmedName = editedName.trim();
    const isNameChanged = trimmedName !== workspace.name;
    const isDisabled = validated === ValidatedOptions.error || !isNameChanged;
    const helperTextInvalid = this.getHelperTextInvalid();

    return (
      <Modal
        variant={ModalVariant.small}
        isOpen={isEditModalOpen}
        title="Edit Workspace Name"
        onClose={() => this.handleCancelChanges()}
        actions={[
          <Button
            key="save"
            variant="primary"
            isDisabled={isDisabled}
            onClick={() => this.handleSaveChanges()}
            data-testid="edit-workspace-name-save"
          >
            Save
          </Button>,
          <Button
            key="cancel"
            variant="secondary"
            onClick={() => this.handleCancelChanges()}
            data-testid="edit-workspace-name-cancel"
          >
            Cancel
          </Button>,
        ]}
      >
        <FormGroup
          fieldId="edit-workspace-name"
          validated={validated}
          helperTextInvalid={helperTextInvalid}
          helperTextInvalidIcon={<ExclamationCircleIcon />}
          className={styles.inputFormGroup}
        >
          <TextInput
            id="edit-workspace-name"
            value={editedName}
            onChange={value => this.handleNameChange(value)}
            validated={validated}
            maxLength={MAX_LENGTH + 1}
            data-testid="edit-workspace-name-input"
            placeholder="Enter workspace name"
          />
        </FormGroup>
      </Modal>
    );
  }

  public render(): React.ReactNode {
    const { workspace, readonly } = this.props;
    const workspaceName = this.buildOpenShiftConsoleLink() || workspace.name;

    return (
      <FormGroup label="Workspace">
        {readonly ? (
          <span className={overviewStyles.readonly}>{workspaceName}</span>
        ) : (
          <span className={overviewStyles.editable}>
            {workspaceName}
            <Button
              data-testid="edit-workspace-name-button"
              variant="plain"
              onClick={() => this.handleEditToggle(true)}
              title="Edit Workspace Name"
            >
              <PencilAltIcon />
            </Button>
          </span>
        )}
        {this.getEditModal()}
      </FormGroup>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  applications: selectApplications(state),
  allWorkspaces: selectAllWorkspaces(state),
});

const connector = connect(mapStateToProps, bannerAlertActionCreators);

type MappedProps = ConnectedProps<typeof connector>;

export default connector(WorkspaceNameFormGroup);
