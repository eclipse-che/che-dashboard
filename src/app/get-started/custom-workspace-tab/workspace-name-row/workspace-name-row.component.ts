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

import { WorkspaceNameRowController } from './workspace-name-row.controller';

export interface IWorkspaceNameRowBindingProperties {
  generateName: string;
  name: string;
  onChange: ($name: string) => void;
}

export interface IWorkspaceNameRowComponentInputBindings {
  name: string;
  generateName: string;
}
export interface IWorkspaceNameRowComponentBindings extends IWorkspaceNameRowComponentInputBindings {
  onChange: (eventObj: { $name: string }) => void;
}

interface IWorkspaceNameRowComponentScopeBindings {
  bindings: { [key in keyof IWorkspaceNameRowComponentBindings]: string };
}

export class WorkspaceNameRowComponent implements ng.IComponentOptions, IWorkspaceNameRowComponentScopeBindings {

  templateUrl = 'app/get-started/custom-workspace-tab/workspace-name-row/workspace-name-row.html';

  controller = WorkspaceNameRowController;
  controllerAs = 'ctrl';

  bindings = {
    generateName: '<',
    name: '<',
    onChange: '&',
  };

}
