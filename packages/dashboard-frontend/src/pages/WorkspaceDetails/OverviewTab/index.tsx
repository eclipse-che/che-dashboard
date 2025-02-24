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

import { Form, PageSection, PageSectionVariants } from '@patternfly/react-core';
import cloneDeep from 'lodash/cloneDeep';
import React from 'react';

import GitRepoFormGroup from '@/pages/WorkspaceDetails/OverviewTab/GitRepo';
import { InfrastructureNamespaceFormGroup } from '@/pages/WorkspaceDetails/OverviewTab/InfrastructureNamespace';
import { ProjectsFormGroup } from '@/pages/WorkspaceDetails/OverviewTab/Projects';
import StorageTypeFormGroup from '@/pages/WorkspaceDetails/OverviewTab/StorageType';
import WorkspaceNameFormGroup from '@/pages/WorkspaceDetails/OverviewTab/WorkspaceName';
import { getParentDevfile } from '@/services/backend-client/parentDevfileApi';
import { DevfileAdapter } from '@/services/devfile/adapter';
import { DEVWORKSPACE_STORAGE_TYPE_ATTR } from '@/services/devfileApi/devWorkspace/spec/template';
import { DevWorkspaceStatus } from '@/services/helpers/types';
import { che } from '@/services/models';
import { constructWorkspace, Workspace } from '@/services/workspace-adapter';

export type Props = {
  onSave: (workspace: Workspace) => Promise<void>;
  workspace: Workspace;
};

export type State = {
  storageType: che.WorkspaceStorageType;
  parentStorageType: che.WorkspaceStorageType | undefined;
};

export class OverviewTab extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    const { workspace } = this.props;

    this.state = {
      storageType: workspace.storageType,
      parentStorageType: undefined,
    };
  }

  async componentDidMount(): Promise<void> {
    const { workspace } = this.props;
    const parent = workspace.ref.spec.template.parent;
    if (!parent) {
      return;
    }
    const parentDevfile = await getParentDevfile({ schemaVersion: '2.2.2', parent });
    if (parentDevfile) {
      const parentDevfileAttributes = DevfileAdapter.getAttributes(parentDevfile);
      const parentStorageType = parentDevfileAttributes[DEVWORKSPACE_STORAGE_TYPE_ATTR];
      if (parentStorageType) {
        this.setState({
          parentStorageType,
        });
      }
    }
  }

  public componentDidUpdate(): void {
    const { storageType } = this.state;
    const workspace = this.props.workspace;

    if (storageType !== workspace.storageType) {
      this.setState({
        storageType: workspace.storageType,
      });
    }
  }

  private async handleStorageSave(storageType: che.WorkspaceStorageType): Promise<void> {
    const workspaceClone = constructWorkspace(cloneDeep(this.props.workspace.ref));
    workspaceClone.storageType = storageType;
    await this.props.onSave(workspaceClone);
    this.setState({ storageType });
  }

  public render(): React.ReactElement {
    const { storageType, parentStorageType } = this.state;
    const { workspace } = this.props;
    const namespace = workspace.namespace;
    const projects = workspace.projects;
    const isDeprecated = workspace.isDeprecated;

    return (
      <React.Fragment>
        <PageSection variant={PageSectionVariants.light}>
          <Form isHorizontal onSubmit={e => e.preventDefault()}>
            <WorkspaceNameFormGroup workspace={workspace} />
            <InfrastructureNamespaceFormGroup namespace={namespace} />
            <StorageTypeFormGroup
              readonly={isDeprecated || workspace.status === DevWorkspaceStatus.TERMINATING}
              storageType={storageType}
              parentStorageType={parentStorageType}
              onSave={storageType => this.handleStorageSave(storageType)}
            />
            <ProjectsFormGroup projects={projects} />
            <GitRepoFormGroup workspace={workspace} />
          </Form>
        </PageSection>
      </React.Fragment>
    );
  }
}
