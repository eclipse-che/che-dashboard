/*
 * Copyright (c) 2018-2021 Red Hat, Inc.
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
import {
  Button,
  Text,
  TextContent,
  Alert,
  AlertActionCloseButton,
  AlertVariant,
  AlertGroup,
  Modal,
  ModalVariant,
} from '@patternfly/react-core';
import DevfileEditor, { DevfileEditor as Editor } from '../../../components/DevfileEditor';
import EditorTools from './EditorTools';
import { convertWorkspace, isDevfileV2, isWorkspaceV1, isWorkspaceV2, Workspace } from '../../../services/workspaceAdapter';
import { IDevWorkspace, IDevWorkspaceDevfile } from '@eclipse-che/devworkspace-client';
import { DevWorkspaceStatus } from '../../../services/helpers/types';
import { DevWorkspaceClient, DEVWORKSPACE_NEXT_START_ANNOTATION } from '../../../services/workspace-client/devWorkspaceClient';
import { container } from '../../../inversify.config';
import * as lodash from 'lodash';

import './EditorTab.styl';

type Props = {
  onSave: (workspace: Workspace) => Promise<void>;
  workspace: Workspace;
  onDevWorkspaceWarning: () => void;
};

type State = {
  devfile: che.WorkspaceDevfile | IDevWorkspaceDevfile;
  hasChanges: boolean;
  hasRequestErrors: boolean;
  currentRequestError: string;
  isDevfileValid: boolean;
  isExpanded: boolean;
  copied?: boolean;
  showDevfileV2ConfirmationModal: boolean;
};

export class EditorTab extends React.PureComponent<Props, State> {
  private originDevfile: che.WorkspaceDevfile | IDevWorkspaceDevfile;
  private readonly devfileEditorRef: React.RefObject<Editor>;
  private devworkspaceClient: DevWorkspaceClient;

  cancelChanges: () => void;

  constructor(props: Props) {
    super(props);
    this.devworkspaceClient = container.get(DevWorkspaceClient);

    this.state = {
      devfile: Object.assign({}, this.props.workspace.devfile),
      hasChanges: false,
      isDevfileValid: true,
      hasRequestErrors: false,
      currentRequestError: '',
      isExpanded: false,
      showDevfileV2ConfirmationModal: false
    };

    this.cancelChanges = (): void => {
      this.updateEditor(this.props.workspace.devfile);
      this.setState({
        hasChanges: false,
        hasRequestErrors: false,
        currentRequestError: '',
      });
    };

    this.devfileEditorRef = React.createRef<Editor>();
  }

  private init(): void {
    const devfile = Object.assign({}, this.props.workspace.devfile);
    if (devfile && (!this.originDevfile || !this.areEqual(devfile, this.originDevfile))) {
      this.originDevfile = devfile;
      this.updateEditor(devfile);
      this.setState({
        hasRequestErrors: false,
        currentRequestError: '',
        hasChanges: false,
      });
    }
  }

  public componentDidMount(): void {
    this.init();
  }

  public componentDidUpdate(): void {
    this.init();
  }

  public render(): React.ReactElement {
    const originDevfile = this.props.workspace.devfile;
    const { devfile } = this.state;

    return (
      <React.Fragment>
        <br />
        {(this.state.currentRequestError) && (
          <Alert
            variant={AlertVariant.danger} isInline title={this.state.currentRequestError}
            actionClose={<AlertActionCloseButton onClose={() => this.setState({ currentRequestError: '' })} />}
          />
        )}
        {(this.state.showDevfileV2ConfirmationModal) && (
          <Modal variant={ModalVariant.small} isOpen={true}
            title="Restart Workspace"
            onClose={() => this.devfileConfirmationCancelation()}
            actions={[
              <Button key="yes" variant="primary" onClick={() => this.saveDevfile()}>
                Yes
            </Button>,
              <Button key="no" variant="secondary" onClick={() => this.devfileConfirmationCancelation()}>
                No
            </Button>,
            ]}
          >
            <TextContent>
              <Text>
                Would you like to restart the workspace with the changes?
            </Text>
            </TextContent>
          </Modal>
        )}
        <TextContent
          className={`workspace-details${this.state.isExpanded ? '-expanded' : ''}`}>
          {(this.state.currentRequestError && this.state.isExpanded) && (
            <AlertGroup isToast>
              <Alert
                variant={AlertVariant.danger}
                title={this.state.currentRequestError}
                actionClose={<AlertActionCloseButton onClose={() => this.setState({ currentRequestError: '' })} />}
              />
            </AlertGroup>
          )}
          <EditorTools devfile={devfile as che.WorkspaceDevfile} handleExpand={isExpanded => {
            this.setState({ isExpanded });
          }} />
          <DevfileEditor
            ref={this.devfileEditorRef}
            devfile={originDevfile}
            decorationPattern="location[ \t]*(.*)[ \t]*$"
            onChange={(devfile, isValid) => {
              this.onDevfileChange(devfile, isValid);
            }}
            isReadonly={isDevfileV2(originDevfile)}
          />
          <Button onClick={() => this.cancelChanges()} variant="secondary" className="cancle-button"
            isDisabled={!this.state.hasChanges && this.state.isDevfileValid}>
            Cancel
          </Button>
          <Button onClick={async () => await this.onSave()} variant="primary" className="save-button"
            isDisabled={!this.state.hasChanges || !this.state.isDevfileValid}>
            Save
          </Button>
        </TextContent>
      </React.Fragment>
    );
  }

  /**
   * When a devfile v2 user does not allow the devworkspace to restart then store the configuration
   * in an annotation that will be used on next start
   */
  private async devfileConfirmationCancelation() {
    const devfile = this.state.devfile;
    if (!devfile) {
      return;
    }
    try {
      await this.checkForModifiedClusterDevWorkspace();
      const devworkspace = this.props.workspace.ref as IDevWorkspace;
      const convertedDevWorkspace = convertWorkspace(this.props.workspace.ref);
      convertedDevWorkspace.devfile = devfile;
      // Store the devfile in here
      (convertedDevWorkspace.ref as IDevWorkspace).metadata.annotations = {
        [DEVWORKSPACE_NEXT_START_ANNOTATION]: JSON.stringify((convertedDevWorkspace.ref as IDevWorkspace)),
      };
      convertedDevWorkspace.ref.status = devworkspace.status;
      this.props.onDevWorkspaceWarning();
      this.props.onSave(convertedDevWorkspace);
      this.setState({
        showDevfileV2ConfirmationModal: false
      });
    } catch (e) {
      this.setState({
        hasChanges: true,
        hasRequestErrors: true,
        currentRequestError: e,
      });
    }
  }

  private updateEditor(devfile: che.WorkspaceDevfile | IDevWorkspaceDevfile): void {
    if (!devfile) {
      return;
    }
    this.devfileEditorRef.current?.updateContent(devfile);
    this.setState({ isDevfileValid: true });
  }

  private onDevfileChange(devfile: che.WorkspaceDevfile, isValid: boolean): void {
    this.setState({ isDevfileValid: isValid });
    if (!isValid) {
      this.setState({ hasChanges: false });
      return;
    }
    if (this.areEqual(this.props.workspace.devfile as che.WorkspaceDevfile, devfile)) {
      this.setState({ hasChanges: false });
      return;
    }
    this.setState({ devfile });
    this.setState({
      hasChanges: true,
      hasRequestErrors: false,
    });
  }

  private async onSave(): Promise<void> {
    if (isWorkspaceV1(this.props.workspace.ref) || this.props.workspace.status !== DevWorkspaceStatus.RUNNING.toUpperCase()) {
      this.saveDevfile();
    } else {
      this.setState({
        showDevfileV2ConfirmationModal: true
      });
    }
  }

  /**
   * Check to see if the current devworkspaces devfile and the cluster devworkspaces devfile are the same. If they
   * are not then throw an error
   * @param workspace The Currne
   */
  private async checkForModifiedClusterDevWorkspace(): Promise<void> {
    const currentDevWorkspace = this.props.workspace.ref as IDevWorkspace;
    const clusterDevWorkspace = await this.devworkspaceClient.getWorkspaceByName(currentDevWorkspace.metadata.namespace, currentDevWorkspace.metadata.name);
    if (!lodash.isEqual(clusterDevWorkspace.spec.template, currentDevWorkspace.spec.template)) {
      throw new Error('Could not save devfile to cluster. The clusters devfile and the incoming devfile are different. Please reload the page to get an updated devfile.');
    }
  }

  private async saveDevfile() {
    const devfile = this.state.devfile;
    if (!devfile) {
      return;
    }
    const workspaceCopy = convertWorkspace(this.props.workspace.ref);
    workspaceCopy.devfile = devfile;
    this.setState({ hasChanges: false });
    try {

      if (isWorkspaceV2(workspaceCopy.ref)) {
        await this.checkForModifiedClusterDevWorkspace();
        // We need to manually re-attach devworkspace id so that we can re-use it to re-add default plugins to the devworkspace custom resource
        const dw = this.props.workspace.ref as IDevWorkspace;
        workspaceCopy.ref.status = dw.status;
      }

      await this.props.onSave(workspaceCopy);
    } catch (e) {
      const errorMessage = e.toString().replace(/^Error: /gi, '');
      this.setState({
        hasChanges: true,
        hasRequestErrors: true,
        currentRequestError: errorMessage,
      });
    }
    this.setState({
      showDevfileV2ConfirmationModal: false
    });
  }

  private sortKeysInObject(obj: che.WorkspaceDevfile | IDevWorkspaceDevfile): che.WorkspaceDevfile | IDevWorkspaceDevfile {
    return Object.keys(obj).sort().reduce((result: che.WorkspaceDevfile | IDevWorkspaceDevfile, key: string) => {
      result[key] = obj[key];
      return result;
    }, {} as che.WorkspaceDevfile | IDevWorkspaceDevfile);
  }

  private areEqual(a: che.WorkspaceDevfile | IDevWorkspaceDevfile, b: che.WorkspaceDevfile | IDevWorkspaceDevfile): boolean {
    return JSON.stringify(this.sortKeysInObject(a)) == JSON.stringify(this.sortKeysInObject(b as che.WorkspaceDevfile));
  }
}

export default EditorTab;
