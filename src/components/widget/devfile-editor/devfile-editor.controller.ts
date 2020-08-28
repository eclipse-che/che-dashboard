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

import { IDevfileEditorComponentBindings } from './devfile-editor.component';
import { CheDevfile } from '../../api/che-devfile.factory';
import { CheBranding } from '../../branding/che-branding';
import { CheWorkspace } from '../../api/workspace/che-workspace.factory';
import { IPlugin, PluginRegistry } from '../../api/plugin-registry.factory';
import { PLUGIN_TYPE } from '../../api/workspace/workspace-data-manager';

type OnChangesObject = {
  [key in keyof IDevfileEditorComponentBindings]: ng.IChangesObject<IDevfileEditorComponentBindings[key]>;
};

export class DevfileEditorController implements ng.IController, IDevfileEditorComponentBindings {

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

    this.cheWorkspace.fetchWorkspaceSettings().then(workspaceSettings =>
      this.pluginRegistry.fetchPlugins(workspaceSettings.cheWorkspacePluginRegistryUrl).then(items => {
        this.cheDevfile.fetchDevfileSchema().then(jsonSchema => {
          const components = jsonSchema &&  jsonSchema.properties ? jsonSchema.properties.components : undefined;
          if (components) {
            const mountSources = components.items.properties.mountSources;
            // mount sources is specific only for some of component types but always appears
            // patch schema and remove default value for boolean mount sources to avoid their appearing during the completion
            if (mountSources && mountSources.default === 'false') {
              delete mountSources.default;
            }
            jsonSchema.additionalProperties = true;
            if (!components.defaultSnippets) {
              components.defaultSnippets = [];
            }
            const pluginsId: string[] = [];
            items.forEach((item: IPlugin) => {
              const id = `${item.publisher}/${item.name}/latest`;
              if (pluginsId.indexOf(id) === -1 && item.type !== PluginRegistry.EDITOR_TYPE) {
                pluginsId.push(id);
                components.defaultSnippets.push({
                  label: item.displayName,
                  description: item.description,
                  body: {id: id, type: PLUGIN_TYPE}
                });
              } else {
                pluginsId.push(item.id);
              }
            });
            if (components.items && components.items.properties) {
              if (!components.items.properties.id) {
                components.items.properties.id = {
                  type: 'string',
                  description: 'Plugin\'s/Editor\'s id.'
                };
              }
              components.items.properties.id.examples = pluginsId;
            }
          }
          const schemas = [{uri: 'inmemory:yaml', fileMatch: ['*'], schema: jsonSchema}];
          yamlService.configure({validate: true, schemas, hover: true, completion: true});
        });
      })
    );
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
