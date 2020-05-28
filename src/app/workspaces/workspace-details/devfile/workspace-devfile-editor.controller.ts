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

import { CheBranding } from '../../../../components/branding/che-branding';
import { CheAPI } from '../../../../components/api/che-api.factory';
import { IPlugin, PluginRegistry } from '../../../../components/api/plugin-registry.factory';
import { PLUGIN_TYPE } from '../../../../components/api/workspace/workspace-data-manager';

/**
 * @ngdoc controller
 * @name workspaces.devfile-editor.controller:WorkspaceDevfileEditorController
 * @description This class is handling the controller for the workspace devfile editor widget
 * @author Anna Shumilova
 */
export class WorkspaceDevfileEditorController {

  static $inject = [
    '$log',
    '$scope',
    '$timeout',
    'cheBranding',
    'cheAPI',
    'pluginRegistry'
  ];
  private $log: ng.ILogService;
  private $scope: ng.IScope;
  private $timeout: ng.ITimeoutService;
  private cheBranding: CheBranding;

  private isActive: boolean;
  private workspaceDevfile: che.IWorkspaceDevfile;
  private workspaceDevfileOnChange: Function;
  private devfileDocsUrl: string;
  private devfileYaml: string;
  private saveTimeoutPromise: ng.IPromise<any>;
  private cheAPI: CheAPI;
  private pluginRegistry: PluginRegistry;

  /**
   * Default constructor that is using resource
   */
  constructor($log: ng.ILogService,
              $scope: ng.IScope,
              $timeout: ng.ITimeoutService,
              cheBranding: CheBranding,
              cheAPI: CheAPI,
              pluginRegistry: PluginRegistry) {
    this.$log = $log;
    this.$scope = $scope;
    this.$timeout = $timeout;
    this.cheBranding = cheBranding;
    this.cheAPI = cheAPI;
    this.pluginRegistry = pluginRegistry;

    this.$scope.$on('edit-workspace-details', (event: ng.IAngularEvent, attrs: { status: string }) => {
      if (attrs.status === 'cancelled') {
        this.$onInit();
      }
    });

    $scope.$watch(() => {
      return this.workspaceDevfile;
    }, () => {
      let devfile: che.IWorkspaceDevfile | {};
      try {
        if(this.devfileYaml) {
          devfile = jsyaml.safeLoad(this.devfileYaml);
        }
      } catch (e) {
        return;
      }

      if (!devfile && !this.workspaceDevfile) {
        return;
      }
      if (!devfile) {
        devfile = {};
      }

      if (angular.equals(devfile, this.workspaceDevfile) === false) {
        Object.keys(devfile).forEach((key: string) => {
          if (!this.workspaceDevfile[key]) {
            delete devfile[key];
          }
        });
        angular.extend(devfile, this.workspaceDevfile);
        this.devfileYaml = jsyaml.safeDump(devfile);
      }
    }, true);
  }

  /**
   * Returns the workspace devfile validation.
   * @returns {che.IValidation}
   */
  workspaceDevfileValidation(): che.IValidation {
    const validation = {
      isValid: true,
      errors: []
    };

    try {
      if(this.devfileYaml) {
        jsyaml.safeLoad(this.devfileYaml);
      }
    } catch (e) {
      if (e && e.name === 'YAMLException') {
        validation.errors = [e.message];
      } else {
        validation.errors = ['Unable to parse YAML.'];
      }
      validation.isValid = false;
      this.$log.error(e);
    }

    return validation;
  }

  $onInit(): void {
    this.devfileYaml = this.workspaceDevfile ? jsyaml.safeDump(this.workspaceDevfile) : '';
    this.devfileDocsUrl = this.cheBranding.getDocs().devfile;
    const yamlService = (window as any).yamlService;
    // TODO should be replaced by DevfileEditorRowComponent(https://github.com/eclipse/che/issues/17007)
    this.cheAPI.getWorkspace().fetchWorkspaceSettings().then(workspaceSettings =>
      this.pluginRegistry.fetchPlugins(workspaceSettings.cheWorkspacePluginRegistryUrl).then(items => {
        this.cheAPI.getDevfile().fetchDevfileSchema().then(jsonSchema => {
          const components = jsonSchema &&  jsonSchema.properties ? jsonSchema.properties.components : undefined;
          if (components) {
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

  /**
   * Callback when editor content is changed.
   */
  onChange(editorState: che.IValidation): void {
    if (!this.isActive) {
      return;
    }

    if (this.saveTimeoutPromise) {
      this.$timeout.cancel(this.saveTimeoutPromise);
    }

    if (!editorState.isValid) {
      const devfile = this.workspaceDevfile;
      this.workspaceDevfileOnChange({ devfile, editorState });
      return;
    }

    this.saveTimeoutPromise = this.$timeout(() => {
      const devfile = this.devfileYaml ? jsyaml.safeLoad(this.devfileYaml) : {};
      if(angular.isObject(this.workspaceDevfile)){
        Object.keys(this.workspaceDevfile).forEach((key: string) => {
          if (!devfile[key]) {
            delete this.workspaceDevfile[key];
          }
        });
        angular.extend(this.workspaceDevfile, devfile);
      } else {
        this.workspaceDevfile = devfile;
      }
      this.workspaceDevfileOnChange({ devfile, editorState });
    }, 500);
  }

}
