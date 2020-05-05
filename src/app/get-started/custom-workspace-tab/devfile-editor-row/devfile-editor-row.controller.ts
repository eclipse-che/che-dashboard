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
import { CheDevfile } from '../../../../components/api/che-devfile.factory';
import { CheBranding } from '../../../../components/branding/che-branding';

type OnChangesObject = {
  [key in keyof IDevfileEditorRowComponentBindings]: ng.IChangesObject<IDevfileEditorRowComponentBindings[key]>;
};

export class DevfileEditorRowController implements ng.IController, IDevfileEditorRowComponentBindings {

  static $inject = [
    '$timeout',
    'cheDevfile',
    'cheBranding'
  ];

  // component bindings
  devfile: che.IWorkspaceDevfile;
  onChange: (eventObj: { $devfile: che.IWorkspaceDevfile, '$editorState': che.IValidation }) => void;

  private devfileYaml: string;
  private devfileDocsUrl: string;
  private timeoutPromise: ng.IPromise<any>;

  // injected services
  private $timeout: ng.ITimeoutService;
  private cheDevfile: CheDevfile;
  private cheBranding: CheBranding;

  constructor(
    $timeout: ng.ITimeoutService,
    cheDevfile: CheDevfile,
    cheBranding: CheBranding,
  ) {
    this.$timeout = $timeout;
    this.cheDevfile = cheDevfile;
    this.cheBranding = cheBranding;
  }

  $onInit(): void {
    this.devfileDocsUrl = this.cheBranding.getDocs().devfile;
    this.devfileYaml = this.devfile ? jsyaml.safeDump(this.devfile) : '';
    const yamlService = (window as any).yamlService;
    this.cheDevfile.fetchDevfileSchema().then(jsonSchema => {
      const schemas = [{
        uri: 'inmemory:yaml',
        fileMatch: ['*'],
        schema: jsonSchema
      }];
      yamlService.configure({
        validate: true,
        schemas,
        hover: true,
        completion: true,
      });
    });
  }

  $onChanges(onChangesObj: OnChangesObject): void {
    if (!onChangesObj.devfile) {
      return;
    }
    if (onChangesObj.devfile.currentValue) {
      this.devfileYaml = jsyaml.safeDump(onChangesObj.devfile.currentValue);
    } else {
      this.devfileYaml = '';
    }
  }

  private onChanged(editorState: che.IValidation, value: string): void {
    if (!editorState.isValid) {
      return;
    }
    if (this.timeoutPromise) {
      this.$timeout.cancel(this.timeoutPromise);
    }
    this.timeoutPromise = this.$timeout(() => {
      const devfile = jsyaml.safeLoad(value);
      this.onChange({'$devfile': devfile, '$editorState': editorState});
    }, 1000);
  }
}
