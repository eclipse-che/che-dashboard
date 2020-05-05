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

import { DevfileEditorRowController } from './devfile-editor-row.controller';

export interface IDevfileEditorRowBindingProperties {
  devfile?: che.IWorkspaceDevfile;
  onChange: ($devfile: che.IWorkspaceDevfile, $editorState: che.IValidation) => void;
}

interface IDevfileEditorRowComponentInputBindings {
  devfile: che.IWorkspaceDevfile;
}
export interface IDevfileEditorRowComponentBindings extends IDevfileEditorRowComponentInputBindings {
  onChange: (eventObj: { $devfile: che.IWorkspaceDevfile, $editorState: che.IValidation }) => void;
}

interface IDevfileEditorRowComponentScopeBindings {
  bindings: { [key in keyof IDevfileEditorRowComponentBindings]: string };
}

export class DevfileEditorRowComponent implements ng.IComponentOptions, IDevfileEditorRowComponentScopeBindings {

  templateUrl = 'app/get-started/custom-workspace-tab/devfile-editor-row/devfile-editor-name-row.html';

  controller = DevfileEditorRowController;
  controllerAs = 'ctrl';

  bindings = {
    devfile: '<?',
    onChange: '&',
  };

}
