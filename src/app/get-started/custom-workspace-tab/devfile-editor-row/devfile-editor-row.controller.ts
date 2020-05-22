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
import { CheWorkspace } from '../../../../components/api/workspace/che-workspace.factory';
import { IPlugin, PluginRegistry } from '../../../../components/api/plugin-registry.factory';

type OnChangesObject = {
  [key in keyof IDevfileEditorRowComponentBindings]: ng.IChangesObject<IDevfileEditorRowComponentBindings[key]>;
};

export class DevfileEditorRowController implements ng.IController, IDevfileEditorRowComponentBindings {

  static $inject = [
    '$timeout',
    'cheDevfile',
    'cheBranding',
    'cheWorkspace',
    'pluginRegistry',
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
  private cheWorkspace: CheWorkspace;
  private pluginRegistry: PluginRegistry;

  constructor(
    $timeout: ng.ITimeoutService,
    cheDevfile: CheDevfile,
    cheBranding: CheBranding,
    cheWorkspace: CheWorkspace,
    pluginRegistry: PluginRegistry
  ) {
    this.$timeout = $timeout;
    this.cheDevfile = cheDevfile;
    this.cheBranding = cheBranding;
    this.cheWorkspace = cheWorkspace;
    this.pluginRegistry = pluginRegistry;
  }

  $onInit(): void {
    this.devfileDocsUrl = this.cheBranding.getDocs().devfile;
    this.devfileYaml = this.devfile ? jsyaml.safeDump(this.devfile) : '';
    const yamlService = (window as any).yamlService;
    this.cheDevfile.fetchDevfileSchema().then(async jsonSchema => {
      if (jsonSchema &&  jsonSchema.properties &&  jsonSchema.properties.components) {
        jsonSchema.additionalProperties = true;
        if (!jsonSchema.properties.components.defaultSnippets) {
          jsonSchema.properties.components.defaultSnippets = [];
        }
        const workspaceSettings = await this.cheWorkspace.fetchWorkspaceSettings();
        const result = await this.pluginRegistry.fetchPlugins(workspaceSettings.cheWorkspacePluginRegistryUrl);
        const type = 'chePlugin';
        const pluginsId: string[] = [];
        result.filter(item => item.type !== PluginRegistry.EDITOR_TYPE).forEach((item: IPlugin) => {
          const id = `${item.publisher}/${item.name}/latest`;
          if (pluginsId.indexOf(id) === -1) {
            pluginsId.push(id);
            jsonSchema.properties.components.defaultSnippets.push({
              'label': item.displayName,
              'description': item.description,
              'body': {id, type}
            });
          } else {
            pluginsId.push(item.id);
          }
        });
        if (jsonSchema.properties.components.items.properties) {
          if (!jsonSchema.properties.components.items.properties.id) {
            jsonSchema.properties.components.items.properties.id = {type: 'string', description: 'Plugin\'s id.'};
          }
          jsonSchema.properties.components.items.properties.id.examples = pluginsId;
          jsonSchema.properties.components.items.properties.id.enum = pluginsId
        }
      }
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
