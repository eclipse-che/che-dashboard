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

import { DevfileEditorController } from './devfile-editor.controller';

export interface IDevfileEditorBindingProperties {
  devfile?: che.IWorkspaceDevfile;
  onChange: ($devfile: che.IWorkspaceDevfile, $editorState: che.IValidation) => void;
}

interface IDevfileEditorComponentInputBindings {
  devfile: che.IWorkspaceDevfile;
}
export interface IDevfileEditorComponentBindings extends IDevfileEditorComponentInputBindings {
  onChange: (eventObj: { $devfile: che.IWorkspaceDevfile, $editorState: che.IValidation }) => void;
}

interface IDevfileEditorComponentScopeBindings {
  bindings: { [key in keyof IDevfileEditorComponentBindings]: string };
}

export class DevfileEditorComponent implements ng.IComponentOptions, IDevfileEditorComponentScopeBindings {

  templateUrl = 'components/widget/devfile-editor/devfile-editor-name.html';

  controller = DevfileEditorController;
  controllerAs = 'ctrl';

  bindings = {
    devfile: '<?',
    onChange: '&',
  };

}
