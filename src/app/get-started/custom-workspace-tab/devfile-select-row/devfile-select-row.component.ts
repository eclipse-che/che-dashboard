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

import { DevfileSelectRowController } from './devfile-select-row.controller';

export interface IDevfileSelectRowBindingProperties {
  onLoad: ($devfile: che.IWorkspaceDevfile, $stackName: string) => void;
  onClear: () => void;
  onError: ($error: string) => void;
}

export interface IDevfileSelectRowComponentBindings {
  onLoad: (eventObj: { $devfile: che.IWorkspaceDevfile, $stackName: string }) => void;
  onClear: () => void;
  onError: (eventObj: { $error: string }) => void;
}

interface IDevfileSelectRowComponentScopeBindings {
  bindings: { [key in keyof IDevfileSelectRowComponentBindings]: string };
}

export class DevfileSelectRowComponent implements ng.IComponentOptions, IDevfileSelectRowComponentScopeBindings {

  templateUrl = 'app/get-started/custom-workspace-tab/devfile-select-row/devfile-select-row.html';
  controller = DevfileSelectRowController;
  controllerAs = 'ctrl';

  bindings = {
    onLoad: '&',
    onClear: '&',
    onError: '&'
  };

}
