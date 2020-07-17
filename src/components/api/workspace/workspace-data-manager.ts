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

export const EDITOR_TYPE = 'cheEditor';
export const PLUGIN_TYPE = 'chePlugin';


/**
 *
 *
 * @author Ann Shumilova
 */
export class WorkspaceDataManager {

  static get DEFAULT_EDITOR(): string {
    return 'eclipse/che-theia/latest';
  }

  /**
   * Returns the name of the pointed workspace.
   *
   * @param workspace workspace name
   */
  getName(workspace: che.IWorkspace): string {
    if (workspace.config) {
      return workspace.config.name;
    } else if (workspace.devfile) {
      return workspace.devfile.metadata.name;
    }
  }

  /**
   * Sets the name of the pointed workspace.
   *
   * @param workspace workspace
   * @param name workspace name
   */
  setName(workspace: che.IWorkspace, name: string): void {
    if (workspace.config) {
      workspace.config.name = name;
    } else if (workspace.devfile) {
      workspace.devfile.metadata.name = name;
    }
  }

  /**
   * Returns the attributes of the pointed workspace.
   *
   * @param workspace workspace
   */
  getAttributes(workspace: che.IWorkspace): che.IWorkspaceConfigAttributes {
    if (workspace.config) {
      return workspace.config.attributes;
    } else if (workspace.devfile) {
      return workspace.devfile.attributes;
    }
  }

  /**
   * Set the attributes of the pointed workspace.
   *
   * @param workspace workspace
   * @param attributes workspace attributes
   */
  setAttributes(workspace: che.IWorkspace, attributes: che.IWorkspaceConfigAttributes): void {
    if (workspace.config) {
      if (attributes) {
        workspace.config.attributes = attributes;
      } else {
        delete workspace.config.attributes;
      }
    } else if (workspace.devfile) {
      if (attributes) {
        workspace.devfile.attributes = attributes;
      } else {
        delete workspace.devfile.attributes;
      }
    }
  }

  /**
   * Returns the projects of the pointed workspace.
   *
   * @param workspace workspace
   */
  getProjects(workspace: che.IWorkspace): Array <any> {
    if (workspace.config) {
      return workspace.config.projects || [];
    } else if (workspace.devfile) {
      return workspace.devfile.projects || [];
    }
  }

  /**
   * Sets the projects of the pointed workspace.
   *
   * @param workspace workspace
   * @param projects workspace projects
   */
  setProjects(workspace: che.IWorkspace, projects: Array<any>): void {
    if (workspace.config) {
      workspace.config.projects = projects;
    } else if (workspace.devfile) {
      workspace.devfile.projects = projects;
    }
  }

  /**
   * Adds the project to the pointed workspace.
   *
   * @param workspace workspace
   * @param project project to be added to pointed workspace
   */
  addProject(workspace: che.IWorkspace, projectTemplate: che.IProjectTemplate): void {
    if (workspace.config) {
      workspace.config.projects = workspace.config.projects || [];
      workspace.config.projects.push(projectTemplate);
    } else if (workspace.devfile) {
      let project = {
        name: projectTemplate.name,
        source: {
          type: projectTemplate.source.type,
          location: projectTemplate.source.location
        }
      };
      workspace.devfile.projects = workspace.devfile.projects || [];
      workspace.devfile.projects.push(project);
    }
  }

  /**
   * Adds the command to the pointed workspace.
   *
   * @param workspace workspace
   * @param command command to be added to pointed workspace
   */
  addCommand(workspace: che.IWorkspace, command: any): void {
    if (workspace.config) {
      workspace.config.commands.push(command);
    } else if (workspace.devfile) {
      workspace.devfile.commands = workspace.devfile.commands || [];
      workspace.devfile.commands.push(command);
    }
  }

  /**
   * Returns the list of plugin ids of the pointed workspace.
   *
   * @param workspace workspace
   */
  getPlugins(workspace: che.IWorkspace): Array<string> {
    let plugins: Array<string> = [];
    if (workspace.config) {
      return workspace.config.attributes && workspace.config.attributes.plugins ?
      workspace.config.attributes.plugins.split(',') : [];
    } else if (workspace.devfile) {
      const components = workspace.devfile.components || [];
      components.forEach(component => {
        if (component.type === PLUGIN_TYPE && component.id) {
          plugins.push(component.id);
        }
      });
    }
    return plugins;
  }

  /**
   * Sets the list of plugins of the pointed workspace.
   *
   * @param workspace workspace
   * @param plugins the list of plugins
   */
  setPlugins(workspace: che.IWorkspace, plugins: Array<string>): void {
    if (workspace.config) {
      workspace.config.attributes = workspace.config.attributes || {};
      workspace.config.attributes.plugins = plugins.join(',');
    } else if (workspace.devfile) {
      let pluginComponents = [];
      workspace.devfile.components = workspace.devfile.components || [];
      workspace.devfile.components.forEach(component => {
        if (component.type === PLUGIN_TYPE) {
          pluginComponents.push(component);
        }
      });

      pluginComponents.forEach((pluginComponent: any) => {
        let index = plugins.indexOf(pluginComponent.id);
        if (index >= 0) {
          plugins.splice(index, 1);
        } else {
          workspace.devfile.components.splice(workspace.devfile.components.indexOf(pluginComponent), 1);
        }
      });

      plugins.forEach((plugin: string) => {
        workspace.devfile.components.push({id: plugin, type: PLUGIN_TYPE});
      });

      if(workspace.devfile.components && workspace.devfile.components.length === 0) {
        delete workspace.devfile.components;
      }
    }
  }

  /**
   * Returns editor's id.
   *
   * @param workspace workspace
   */
  getEditor(workspace: che.IWorkspace): string {
    if (workspace.config) {
      return workspace.config.attributes && workspace.config.attributes.editor ?
      workspace.config.attributes.editor : null;
    } else if (workspace.devfile) {
      let editor = WorkspaceDataManager.DEFAULT_EDITOR;
      const components = workspace.devfile.components || [];
      components.forEach(component => {
        if (component.type === EDITOR_TYPE) {
          editor = component.id;
        }
      });
      return editor;
    }
  }

  /**
   * Sets the editor of the pointed workspace.
   *
   * @param workspace workspace
   * @param editor editor's id
   */
  setEditor(workspace: che.IWorkspace, editor: string): void {
    if (workspace.config) {
      workspace.config.attributes = workspace.config.attributes || {};
      workspace.config.attributes.editor = editor;
    } else if (workspace.devfile) {
      let editorComponents = [];
      workspace.devfile.components = workspace.devfile.components || [];
      workspace.devfile.components.forEach(component => {
        if (component.type === EDITOR_TYPE) {
          editorComponents.push(component);
        }
      });

      editorComponents.forEach((editor: any) => {
        workspace.devfile.components.splice(workspace.devfile.components.indexOf(editor), 1);
      });

      if (editor) {
        workspace.devfile.components.push({id: editor, type: EDITOR_TYPE});
      }

      if(workspace.devfile.components && workspace.devfile.components.length === 0) {
        delete workspace.devfile.components;
      }
    }
  }

}
