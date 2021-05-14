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

import { IDevWorkspace } from '@eclipse-che/devworkspace-client';
import getRandomString from '../../services/helpers/random';
import { DevWorkspaceStatus, WorkspaceStatus } from '../../services/helpers/types';

export class DevWorkspaceBuilder {

  private workspace: IDevWorkspace = {
    kind: 'DevWorkspace',
    apiVersion: 'workspace.devfile.io/v1alpha2',
    metadata: {
      name: 'dev-wksp-' + getRandomString(4),
      namespace: '',
    },
    spec: {
      started: false,
      routingClass: 'che',
      template: {},
    },
    status: {
      devworkspaceId: getRandomString(4),
      mainUrl: '',
      phase: 'STOPPED',
    }
  }

  withId(id: string): DevWorkspaceBuilder {
    this.workspace.status.devworkspaceId = id;
    return this;
  }

  withName(name: string): DevWorkspaceBuilder {
    this.workspace.metadata.name = name;
    return this;
  }

  withMetadata(metadata: IDevWorkspace['metadata']): DevWorkspaceBuilder {
    this.workspace.metadata = metadata;
    return this;
  }

  withNamespace(namespace: string): DevWorkspaceBuilder {
    this.workspace.metadata.namespace = namespace;
    return this;
  }

  withIdeUrl(ideUrl: string): DevWorkspaceBuilder {
    this.workspace.status.mainUrl = ideUrl;
    return this;
  }

  withStatus(status: keyof typeof WorkspaceStatus | keyof typeof DevWorkspaceStatus): DevWorkspaceBuilder {
    this.workspace.status.phase = status;
    return this;
  }

  withProjects(projects: any): DevWorkspaceBuilder {
    this.workspace.spec.template.projects = projects;
    return this;
  }

  build(): IDevWorkspace {
    return this.workspace;
  }

}
