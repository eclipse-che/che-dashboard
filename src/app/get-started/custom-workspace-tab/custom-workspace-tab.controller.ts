/*
 * Copyright (c) 2015-2018 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */
'use strict';

import { IChePfButtonProperties } from '../../../components/che-pf-widget/button/che-pf-button';
import { CreateWorkspaceSvc } from '../../workspaces/create-workspace/create-workspace.service';
import { IInfrastructureNamespaceRowBindingProperties } from './infrastructure-namespace-row/infrastructure-namespace-row.component';
import { IWorkspaceNameRowBindingProperties } from './workspace-name-row/workspace-name-row.component';
import { ITemporaryStorageRowBindingProperties } from './temporary-storage-row/temporary-storage-row.component';
import { IDevfileSelectRowBindingProperties } from './devfile-select-row/devfile-select-row.component';

export class CustomWorkspaceTabController implements ng.IController {

  static $inject = [
    'createWorkspaceSvc',
  ];

  // used in the template
  createButton: IChePfButtonProperties;
  infrastructureNamespaceProperties: IInfrastructureNamespaceRowBindingProperties;
  workspaceNameProperties: IWorkspaceNameRowBindingProperties;
  temporaryStorageProperties: ITemporaryStorageRowBindingProperties;
  devfileSelectProperties: IDevfileSelectRowBindingProperties;

  // injected services
  private createWorkspaceSvc: CreateWorkspaceSvc;

  private namespace: string;
  private workspaceName: string;
  private temporaryStorage: boolean;
  private stackName: string;
  private devfile: che.IWorkspaceDevfile;

  constructor(
    createWorkspaceSvc: CreateWorkspaceSvc,
  ) {
    this.createWorkspaceSvc = createWorkspaceSvc;

    this.createButton = {
      title: 'Create & Open',
      onClick: () => this.createWorkspace(),
    };
    this.infrastructureNamespaceProperties = {
      onSelect: name => {
        this.namespace = name;
        this.updateDevfile();
      },
    };
    this.workspaceNameProperties = {
      generateName: '',
      name: '',
      onChange: name => {
        this.workspaceName = name;
        this.updateDevfile();
      },
    };
    this.temporaryStorageProperties = {
      onChange: temporary => {
        this.temporaryStorage = temporary;
        this.updateDevfile();
      },
    };
    this.devfileSelectProperties = {
      onLoad: (devfile, stackName) => {
        this.devfile = devfile;
        this.stackName = stackName;
        this.updateDevfile();
      },
    };
  }

  $onInit(): void { }

  get createButtonDisabled(): boolean {
    return !(this.namespace && this.workspaceName && this.devfile);
  }

  private updateDevfile(): void {
    if (!this.devfile) {
      return;
    }

    if (this.temporaryStorage) {
      if (!this.devfile.attributes) {
        this.devfile.attributes = {};
      }
      this.devfile.attributes.persistVolumes = 'false';
    } else {
      if (this.devfile.attributes && this.devfile.attributes.persistVolumes) {
        delete this.devfile.attributes.persistVolumes;
        if (Object.keys(this.devfile.attributes).length === 0) {
          delete this.devfile.attributes;
        }
      }
    }
    if (this.workspaceName) {
      if (!this.devfile.metadata) {
        this.devfile.metadata = {}
      }
      this.devfile.metadata.name = this.workspaceName;
    } else {
      if (this.devfile.metadata && this.devfile.metadata.name) {
        delete this.devfile.metadata.name;
        if (Object.keys(this.devfile.metadata).length === 0) {
          delete this.devfile.metadata;
        }
      }
    }
  }

  private createWorkspace(): ng.IPromise<che.IWorkspace> {
    const attributes = { stackName: this.stackName };
    return this.createWorkspaceSvc.createWorkspaceFromDevfile(this.namespace, this.devfile, attributes, false);
  }

}
