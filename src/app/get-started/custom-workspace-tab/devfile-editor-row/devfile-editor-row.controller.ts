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

import { IDevfileEditorRowComponentBindings } from './devfile-editor-row.component';

export class DevfileEditorRowController implements  ng.IController, IDevfileEditorRowComponentBindings {

  // component bindings
  devfile: che.IWorkspaceDevfile;
  onChange: (eventObj: { $devfile: che.IWorkspaceDevfile, '$editorState': che.IValidation }) => void;

  private onChanged(editorState: che.IValidation): void {
    if (!editorState.isValid) {
      return;
    }
    try {
       this.onChange({ '$devfile': this.devfile, '$editorState': editorState });
    } catch (e) { }
  }
}
