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
import { Form, FormGroup, PageSection, PageSectionVariants } from '@patternfly/react-core';
import StorageTypeFormGroup from './StorageType';
import { WorkspaceNameFormGroup } from './WorkspaceName';
import InfrastructureNamespaceFormGroup from './InfrastructureNamespace';
import { updateDevfile } from '../../../services/storageTypes';

type Props = {
  onSave: (workspace: che.Workspace) => Promise<void>;
  workspace: che.Workspace;
};

export type State = {
  storageType: che.WorkspaceStorageType;
  namespace: string;
  workspaceName: string;
};

export class OverviewTab extends React.Component<Props, State> {
  private isWorkspaceNameChanged = false;
  private workspaceNameCallbacks: { cancelChanges?: () => void } = {};

  constructor(props: Props) {
    super(props);

    const { workspace } = this.props;
    const storageType = this.getStorageType(workspace.devfile);
    const workspaceName = workspace.devfile.metadata.name ? workspace.devfile.metadata.name : '';
    const namespace = workspace.attributes && workspace.attributes.infrastructureNamespace ? workspace.attributes.infrastructureNamespace : '';

    this.state = { storageType, workspaceName, namespace };
  }

  public get hasChanges() {
    return this.isWorkspaceNameChanged;
  }

  public cancelChanges(): void {
    if (this.workspaceNameCallbacks.cancelChanges) {
      this.workspaceNameCallbacks.cancelChanges();
    }
  }

  private async handleWorkspaceNameSave(workspaceName: string): Promise<void> {
    const newDevfile = Object.assign({}, this.props.workspace.devfile);
    newDevfile.metadata.name = workspaceName;
    this.setState({ workspaceName });
    await this.onSave(newDevfile);
  }

  private async handleStorageSave(storageType: che.WorkspaceStorageType): Promise<void> {
    const newDevfile = updateDevfile(this.props.workspace.devfile, storageType);
    this.setState({ storageType });
    await this.onSave(newDevfile);
  }

  private getStorageType(devfile: che.WorkspaceDevfile): che.WorkspaceStorageType {
    if (devfile.attributes && devfile.attributes.persistVolumes === 'false') {
      const isAsync = devfile.attributes && devfile.attributes.asyncPersist === 'true';
      if (isAsync) {
        return 'async';
      } else {
        return 'ephemeral';
      }
    } else {
      return 'persistent';
    }
  }

  public render(): React.ReactElement {
    const devfile = this.props.workspace.devfile;
    const storageType = this.getStorageType(devfile);
    const workspaceName = devfile.metadata.name ? devfile.metadata.name : '';
    const namespace = this.state.namespace;
    const projects = devfile.projects ? devfile.projects.map(project => project.name) : [];

    return (
      <React.Fragment>
        <PageSection
          variant={PageSectionVariants.light}
        >
          <Form isHorizontal onSubmit={e => e.preventDefault()}>
            <WorkspaceNameFormGroup
              name={workspaceName}
              onSave={_workspaceName => this.handleWorkspaceNameSave(_workspaceName)}
              onChange={_workspaceName => {
                this.isWorkspaceNameChanged = workspaceName !== _workspaceName;
              }}
              callbacks={this.workspaceNameCallbacks}
            />
            <InfrastructureNamespaceFormGroup namespace={namespace} />
            <StorageTypeFormGroup
              storageType={storageType}
              onSave={_storageType => this.handleStorageSave(_storageType)}
            />
            <FormGroup label="Projects" fieldId="projects">
              <div style={{ paddingTop: '5px', lineHeight: '30px' }}>{projects.join(', ')}</div>
            </FormGroup>
          </Form>
        </PageSection>
      </React.Fragment>
    );
  }

  private async onSave(devfile: che.WorkspaceDevfile): Promise<void> {
    const newWorkspaceObj = Object.assign({}, this.props.workspace);
    newWorkspaceObj.devfile = devfile;

    await this.props.onSave(newWorkspaceObj);
  }

}

export default OverviewTab;
