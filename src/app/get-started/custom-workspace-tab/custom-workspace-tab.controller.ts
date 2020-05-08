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
import { IDevfileEditorRowBindingProperties } from './devfile-editor-row/devfile-editor-row.component';

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
  devfileEditorProperties: IDevfileEditorRowBindingProperties;

  // injected services
  private createWorkspaceSvc: CreateWorkspaceSvc;

  private namespace: string;
  private workspaceName: string;
  private temporaryStorage: boolean;
  private temporaryStorageDefault: boolean;
  private stackName: string;
  private devfile: che.IWorkspaceDevfile;
  private editorState: che.IValidation;
  private devfileInputsForm: ng.IFormController;

  constructor(
    createWorkspaceSvc: CreateWorkspaceSvc,
  ) {
    this.createWorkspaceSvc = createWorkspaceSvc;

    this.createButton = {
      title: 'Create & Open',
      onClick: () => this.createWorkspace().then((workspace: che.IWorkspace) => {
        this.createWorkspaceSvc.redirectToIDE(workspace);
      }),
    };
    this.infrastructureNamespaceProperties = {
      onSelect: name => {
        this.namespace = name;
        this.updateDevfile();
        this.updateProperties();
      },
    };
    this.workspaceNameProperties = {
      generateName: '',
      name: '',
      onChange: name => {
        this.workspaceName = name;
        if (!this.devfile) {
          this.devfile = this.minDevfile;
        }
        this.updateDevfile();
        this.updateProperties();
      },
    };
    this.temporaryStorageProperties = {
      onChange: (temporary, defaultValue) => {
        this.temporaryStorage = temporary;
        this.temporaryStorageDefault = defaultValue;
        if (!this.devfile) {
          this.devfile = this.minDevfile;
        }
        this.updateDevfile();
        this.updateProperties();
      },
    };
    this.devfileSelectProperties = {
      onError: () => {
        delete this.devfile;
        this.updateProperties();
      },
      onClear: () => {
        delete this.devfile;
        this.updateProperties();
      },
      onLoad: (devfile, stackName) => {
        this.devfile = Object['fromEntries'](Object.keys(devfile)
          .sort((a, b) => a !== b ? a > b ? -1 : 1 : 0)
          .map(key => [key, devfile[key]]));
        this.stackName = stackName;
        this.updateDevfile();
        this.updateProperties();
      },
    };
    this.devfileEditorProperties = {
      onChange: (devfile, editorState) => {
        this.editorState = editorState;
        if (editorState.isValid) {
          this.devfile = devfile;
          this.updateProperties();
        }
      },
    };
  }

  $onInit(): void {
    this.devfile = this.minDevfile;
    this.updateProperties();
  }

  get createButtonDisabled(): boolean {
    if (!this.devfile || !this.editorState) {
      return true;
    }
    const hasGenerateName = this.devfile && this.devfile.metadata && this.devfile.metadata.generateName;
    const isDevfileValid = this.devfileInputsForm.$valid && this.editorState.isValid;
    return !(this.namespace && (this.workspaceName || hasGenerateName) && isDevfileValid);
  }

  private get minDevfile(): che.IWorkspaceDevfile {
    return {
      metadata: {
        generateName: 'wksp-custom-'
      },
      apiVersion: '1.0.0'
    };
  }

  private updateDevfile(): void {
    if (!this.devfile) {
      return;
    }

    if (this.temporaryStorage === this.temporaryStorageDefault) {
        if (this.devfile.attributes && this.devfile.attributes.persistVolumes) {
          delete this.devfile.attributes.persistVolumes;
          if (Object.keys(this.devfile.attributes).length === 0) {
            delete this.devfile.attributes;
          }
        }
    } else {
      if (!this.devfile.attributes) {
        this.devfile.attributes = {};
      }
      if (this.temporaryStorage) {
        this.devfile.attributes.persistVolumes = 'false';
      } else {
        this.devfile.attributes.persistVolumes = 'true';
      }
    }
    if (this.workspaceName) {
      if (!this.devfile.metadata) {
        this.devfile.metadata = {}
      }
      this.devfile.metadata.name = this.workspaceName;
      if (this.devfile.metadata.generateName) {
        delete this.devfile.metadata.generateName;
      }
    } else {
      if (this.devfile.metadata && this.devfile.metadata.name) {
        delete this.devfile.metadata.name;
        if (Object.keys(this.devfile.metadata).length === 0) {
          delete this.devfile.metadata;
        }
      }
    }
  }

  private updateProperties(): void {
    if (!this.devfile) {
      this.workspaceNameProperties.name = '';
      this.workspaceNameProperties.generateName = '';
      delete this.stackName;
      delete this.devfileEditorProperties.devfile;
      return;
    }
    if (this.devfile.attributes && this.devfile.attributes.persistVolumes) {
      this.temporaryStorageProperties.temporary = this.devfile.attributes.persistVolumes === 'false';
    } else {
      this.temporaryStorageProperties.temporary = undefined;
    }
    if (this.devfile.metadata && this.devfile.metadata.name) {
      this.workspaceNameProperties.name = this.devfile.metadata.name;
    }

    if (this.devfile.metadata) {
      this.workspaceNameProperties.generateName = this.devfile.metadata.generateName;
    }
    this.devfileEditorProperties.devfile = angular.copy(this.devfile);
  }

  private createWorkspace(): ng.IPromise<che.IWorkspace> {
    const attributes = { stackName: this.stackName };
    return this.createWorkspaceSvc.createWorkspaceFromDevfile(this.namespace, this.devfile, attributes, true);
  }

}
