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

import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import {
  Button,
  ButtonVariant,
  Checkbox,
  Modal,
  ModalVariant,
  Text,
  TextContent,
  TextVariants,
  Title,
} from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import {
  buildDetailsPath,
  buildIdeLoaderPath,
  buildWorkspacesPath,
} from '../../services/helpers/location';
import {
  IdeLoaderTab,
  WorkspaceAction,
  WorkspaceDetailsTab,
  WorkspaceStatus,
} from '../../services/helpers/types';
import { AppState } from '../../store';
import { selectAllWorkspaces } from '../../store/Workspaces/selectors';
import * as WorkspacesStore from '../../store/Workspaces';
import { WorkspaceActionsContext } from './context';

type Deferred = {
  resolve: () => void;
  reject: () => void;
}

type Props = MappedProps & {
  children: React.ReactElement;
};
type State = {
  isDeleted: string[];
  wantDelete: string[];
  isOpen: boolean;
  isConfirmed: boolean;
  deferred?: Deferred;
};

export class WorkspaceActionsProvider extends React.Component<Props, State> {

  private deleting: Set<string> = new Set();

  constructor(props: Props) {
    super(props);

    this.state = {
      isDeleted: [],
      wantDelete: [],
      isOpen: false,
      isConfirmed: false,
    };
  }

  /**
   * Performs an action on the given workspace
   */
  private async handleAction(action: WorkspaceAction, id: string): Promise<string | void> {
    const workspace = this.props.allWorkspaces.find(workspace => id === workspace.id);

    if (!workspace) {
      console.warn(`Workspace not found, ID: ${id}.`);
      return;
    }

    if (this.deleting.has(id)) {
      console.warn(`Workspace "${workspace.devfile.metadata.name}" is being deleted.`);
      return;
    }

    switch (action) {
      case WorkspaceAction.OPEN_IDE:
        {
          return buildIdeLoaderPath(workspace);
        }
      case WorkspaceAction.START_DEBUG_AND_OPEN_LOGS:
        {
          await this.props.startWorkspace(workspace.id, {
            'debug-workspace-start': true
          });
          return buildIdeLoaderPath(workspace, IdeLoaderTab.Logs);
        }
      case WorkspaceAction.START_IN_BACKGROUND:
        {
          await this.props.startWorkspace(workspace.id);
        }
        break;
      case WorkspaceAction.STOP_WORKSPACE:
        {
          await this.props.stopWorkspace(workspace.id);
        }
        break;
      case WorkspaceAction.ADD_PROJECT:
        return buildDetailsPath(workspace, WorkspaceDetailsTab.Devfile);
      case WorkspaceAction.DELETE_WORKSPACE:
        {
          if (WorkspaceStatus[workspace.status] !== WorkspaceStatus.STOPPED
            && WorkspaceStatus[workspace.status] !== WorkspaceStatus.ERROR) {
            throw new Error('Only STOPPED workspaces can be deleted.');
          }

          this.deleting.add(id);
          this.setState({
            isDeleted: Array.from(this.deleting),
          });

          try {
            await this.props.deleteWorkspace(workspace.id);
            this.deleting.delete(id);
            this.setState({
              isDeleted: Array.from(this.deleting),
            });
            return buildWorkspacesPath();
          } catch (e) {
            this.deleting.delete(id);
            this.setState({
              isDeleted: Array.from(this.deleting),
            });
            console.error(`Action failed: "${action}", ID: "${id}", e: ${e}.`);
          }
        }
        break;
      default:
        console.warn(`Unhandled action type: "${action}".`);
    }
  }

  public async showConfirmation(wantDelete: string[]): Promise<void> {
    let deferred: Deferred | undefined;
    const promise = new Promise<void>((resolve, reject) => {
      deferred = {
        resolve,
        reject,
      };
    });

    this.setState({
      isOpen: true,
      isConfirmed: false,
      wantDelete,
      deferred,
    });

    return promise;
  }

  private handleOnDelete(): void {
    this.state.deferred?.resolve();

    this.setState({
      isConfirmed: false,
      isOpen: false,
    });
  }

  private handleOnClose(): void {
    this.state.deferred?.reject();

    this.setState({
      isConfirmed: false,
      isOpen: false,
    });
  }

  private handleConfirmationChange(isConfirmed: boolean): void {
    this.setState({
      isConfirmed,
    });
  }

  public buildConfirmationWindow(): React.ReactElement {
    const { isOpen, isConfirmed, wantDelete } = this.state;

    let confirmationText: string;
    if (wantDelete.length === 1) {
      const workspaceName = wantDelete[0];
      if (workspaceName) {
        confirmationText = `Would you like to delete workspace "${workspaceName}"?`;
      } else {
        confirmationText = 'Would you like to delete selected workspace?';
      }
    } else {
      confirmationText = `Would you like to delete ${wantDelete.length} workspaces?`;
    }

    const body = (
      <TextContent>
        <Text component={TextVariants.p}>
          {confirmationText}
        </Text>
        <Checkbox
          style={{ margin: '0 0 0 0.4rem' }}
          data-testid="confirmation-checkbox"
          isChecked={this.state.isConfirmed}
          onChange={isChecked => this.handleConfirmationChange(isChecked)}
          id="confirmation-checkbox"
          label="I understand, this operation cannot be reverted."
        />
      </TextContent>
    );

    const header = (
      <Title headingLevel="h2">
        <ExclamationTriangleIcon
          color="orange"
          style={{
            marginBottom: '-0.2rem',
            marginRight: '0.5rem',
            fontSize: '24px',
          }}
        />
        Delete Workspace
      </Title>
    );

    const footer = (
      <React.Fragment>
        <Button
          variant={ButtonVariant.danger}
          isDisabled={isConfirmed === false}
          data-testid="delete-workspace-button"
          onClick={() => this.handleOnDelete()}
        >
          Delete
        </Button>
        <Button
          variant={ButtonVariant.link}
          data-testid="cancel-workspace-button"
          onClick={() => this.handleOnClose()}
        >
          Cancel
        </Button>
      </React.Fragment>
    );

    return (
      <Modal
        header={header}
        variant={ModalVariant.small}
        isOpen={isOpen}
        onClose={() => this.handleOnClose()}
        aria-label="Delete workspaces confirmation window"
        footer={footer}
      >
        {body}
      </Modal>
    );
  }

  public render(): React.ReactElement {
    const { isDeleted } = this.state;

    const confirmationWindow = this.buildConfirmationWindow();

    return (
      <WorkspaceActionsContext.Provider
        value={{
          handleAction: (action, id) => this.handleAction(action, id),
          showConfirmation: (wantDelete: string[]) => this.showConfirmation(wantDelete),
          isDeleted,
        }}
      >
        {this.props.children}
        {confirmationWindow}
      </WorkspaceActionsContext.Provider>
    );
  }

}

const mapStateToProps = (state: AppState) => ({
  allWorkspaces: selectAllWorkspaces(state),
});

const connector = connect(
  mapStateToProps,
  WorkspacesStore.actionCreators,
);

type MappedProps = ConnectedProps<typeof connector>;
export default connector(WorkspaceActionsProvider);
