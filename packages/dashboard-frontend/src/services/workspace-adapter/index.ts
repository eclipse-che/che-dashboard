/*
 * Copyright (c) 2018-2025 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { load } from 'js-yaml';

import devfileApi, { isDevWorkspace } from '@/services/devfileApi';
import { DEVWORKSPACE_UPDATING_TIMESTAMP_ANNOTATION } from '@/services/devfileApi/devWorkspace/metadata';
import { DEVWORKSPACE_STORAGE_TYPE_ATTR } from '@/services/devfileApi/devWorkspace/spec/template';
import {
  EXISTING_WORKSPACE_NAME,
  FACTORY_URL_ATTR,
  PROPAGATE_FACTORY_ATTRS,
} from '@/services/helpers/factoryFlow/buildFactoryParams';
import {
  DeprecatedWorkspaceStatus,
  DevWorkspaceStatus,
  WorkspaceStatus,
} from '@/services/helpers/types';
import { che } from '@/services/models';
import {
  DEVWORKSPACE_DEVFILE_SOURCE,
  DEVWORKSPACE_LABEL_METADATA_NAME,
} from '@/services/workspace-client/devworkspace/devWorkspaceClient';

export interface Workspace {
  readonly ref: devfileApi.DevWorkspace;

  readonly id: string;
  readonly uid: string;
  name: string;
  readonly namespace: string;
  readonly infrastructureNamespace: string;
  readonly created: number;
  readonly source?: string; // the repository URL or the factory URL
  readonly updated: number;
  status: WorkspaceStatus | DevWorkspaceStatus | DeprecatedWorkspaceStatus;
  readonly ideUrl?: string;
  storageType: che.WorkspaceStorageType;
  readonly projects: string[];
  readonly isStarting: boolean;
  readonly isStopped: boolean;
  readonly isStopping: boolean;
  readonly isRunning: boolean;
  readonly hasError: boolean;
  readonly error: string | undefined;
  readonly isDevWorkspace: boolean;
  readonly isDeprecated: boolean;
}

export class WorkspaceAdapter<T extends devfileApi.DevWorkspace> implements Workspace {
  private static deprecatedUIDs: string[] = [];
  private readonly workspace: T;

  constructor(workspace: T) {
    if (isDevWorkspace(workspace)) {
      this.workspace = workspace;
    } else {
      console.error('Unexpected workspace object shape:', workspace);
      throw new Error('Unexpected workspace object shape.');
    }
  }

  static setDeprecatedUIDs(UIDs: string[]) {
    WorkspaceAdapter.deprecatedUIDs = UIDs;
  }

  static isDeprecated(workspace: devfileApi.DevWorkspace): boolean {
    if (isDevWorkspace(workspace)) {
      return false;
    } else {
      return true;
    }
  }

  /**
   * Returns a workspace ID.
   * Note that IDs may intersect for Che7 workspaces and DevWorkspaces.
   */
  static getId(workspace: devfileApi.DevWorkspace): string {
    if (workspace.status?.devworkspaceId) {
      return workspace.status.devworkspaceId;
    }
    return 'workspace' + workspace.metadata.uid.split('-').splice(0, 3).join('');
  }

  /**
   * Returns a unique workspace ID.
   */
  static getUID(workspace: devfileApi.DevWorkspace): string {
    return workspace.metadata.uid;
  }

  static getStatus(
    workspace: devfileApi.DevWorkspace,
  ): DevWorkspaceStatus | DeprecatedWorkspaceStatus {
    if (WorkspaceAdapter.isDeprecated(workspace)) {
      return 'Deprecated';
    }
    if (!workspace.status?.phase) {
      return workspace.spec.started ? DevWorkspaceStatus.STARTING : DevWorkspaceStatus.STOPPED;
    }

    return workspace.status.phase as DevWorkspaceStatus;
  }

  static buildClusterConsoleUrl(
    workspace: devfileApi.DevWorkspace,
    clusterConsoleUrl: string,
  ): string {
    const workspaceName = workspace.metadata.name;
    const userNamespace = workspace.metadata.namespace;
    const resourcePath = workspace.apiVersion.replace('/', '~') + '~' + workspace.kind;

    return `${clusterConsoleUrl}/k8s/ns/${userNamespace}/${resourcePath}/${workspaceName}`;
  }

  get ref(): T {
    return this.workspace;
  }

  get id(): string {
    return WorkspaceAdapter.getId(this.workspace);
  }

  get uid(): string {
    return WorkspaceAdapter.getUID(this.workspace);
  }

  get name(): string {
    return (
      this.workspace.metadata.labels?.[DEVWORKSPACE_LABEL_METADATA_NAME] ||
      this.workspace.metadata.name
    );
  }

  set name(name: string) {
    if (name) {
      if (!this.workspace.metadata.labels) {
        this.workspace.metadata.labels = {};
      }
      this.workspace.metadata.labels[DEVWORKSPACE_LABEL_METADATA_NAME] = name;
    } else {
      if (this.workspace.metadata.labels?.[DEVWORKSPACE_LABEL_METADATA_NAME]) {
        delete this.workspace.metadata.labels[DEVWORKSPACE_LABEL_METADATA_NAME];
        if (Object.keys(this.workspace.metadata.labels).length === 0) {
          delete this.workspace.metadata.labels;
        }
      }
    }
  }

  get namespace(): string {
    return this.workspace.metadata.namespace;
  }

  get isDevWorkspace(): boolean {
    return isDevWorkspace(this.workspace);
  }

  get infrastructureNamespace(): string {
    return this.workspace.metadata.namespace;
  }

  /**
   * Returns a workspace creation time in ms
   */
  get created(): number {
    if (this.workspace.metadata.creationTimestamp) {
      // `creationTimestamp` is a date time String
      return new Date(this.workspace.metadata.creationTimestamp).getTime();
    }
    return new Date().getTime();
  }

  /**
   * Returns a workspace source with propagated factory attributes.
   * This matches the format used by factoryParams.sourceUrl to ensure
   * workspaces with different factory configurations are treated as separate sources.
   *
   * Example:
   * - Base URL: https://github.com/user/repo
   * - With params: https://github.com/user/repo?che-editor=che-code&storageType=per-user
   */
  get source(): string | undefined {
    const devfileSourceStr = this.workspace.metadata.annotations?.[DEVWORKSPACE_DEVFILE_SOURCE];
    if (!devfileSourceStr) {
      return undefined;
    }
    // Parse the devfile source annotation to extract the repository URL
    const devfileSource = load(devfileSourceStr) as {
      factory?: {
        params?: string;
      };
      scm?: {
        repo?: string;
        fileName?: string;
      };
      url?: {
        location?: string;
      };
    };
    // Check if the devfile source has a factory with parameters
    const factoryParams = devfileSource?.factory?.params;
    if (factoryParams) {
      // Split the factory params string into an array of parameters
      const paramsArr = factoryParams.split('&');
      if (paramsArr.length === 0) {
        return undefined;
      }

      // Find the URL parameter in the factory params
      const targetParam = paramsArr.find(param => param.startsWith('url='));
      if (!targetParam) {
        return undefined;
      }

      // Split on first '=' only (URL may contain '=' in query params)
      let sourceUrl = targetParam.substring(4); // Remove 'url=' prefix

      // Propagated factory attributes (excluding 'url' and 'existing')
      // These match PROPAGATE_FACTORY_ATTRS from buildFactoryParams
      const propagatedAttrs = PROPAGATE_FACTORY_ATTRS.filter(
        attr => attr !== EXISTING_WORKSPACE_NAME && attr !== FACTORY_URL_ATTR,
      );

      // Collect factory params that should be propagated
      const paramsToAppend: Array<{ key: string; value: string }> = [];
      paramsArr.forEach(param => {
        const equalIndex = param.indexOf('=');
        if (equalIndex === -1) return;

        const key = param.substring(0, equalIndex);
        const value = param.substring(equalIndex + 1);

        if (key !== 'url' && key !== 'existing' && propagatedAttrs.includes(key)) {
          paramsToAppend.push({ key, value });
        }
      });

      // Sort params alphabetically by key
      paramsToAppend.sort((a, b) => a.key.localeCompare(b.key));

      // Append factory params to source URL
      paramsToAppend.forEach(({ key, value }) => {
        const separator = sourceUrl.includes('?') ? '&' : '?';
        sourceUrl += `${separator}${key}=${value}`;
      });

      return sourceUrl;
    }
    // Check if the devfile source has a repository URL
    const repo = devfileSource?.scm?.repo;
    if (repo) {
      return repo;
    }
    // Check if the devfile source has a URL location
    const location = devfileSource?.url?.location;
    if (location) {
      return location;
    }
    // If no URL found, return undefined
    return undefined;
  }

  /**
   * Returns a workspace last updated time in ms
   */
  get updated(): number {
    const updated =
      this.workspace.metadata.annotations?.[DEVWORKSPACE_UPDATING_TIMESTAMP_ANNOTATION];
    if (updated) {
      return new Date(updated).getTime();
    }
    return new Date().getTime();
  }

  get status(): WorkspaceStatus | DevWorkspaceStatus | DeprecatedWorkspaceStatus {
    return WorkspaceAdapter.getStatus(this.workspace);
  }

  get isDeprecated(): boolean {
    return WorkspaceAdapter.isDeprecated(this.workspace);
  }

  get isStarting(): boolean {
    return WorkspaceAdapter.getStatus(this.workspace) === DevWorkspaceStatus.STARTING;
  }

  get isStopped(): boolean {
    return WorkspaceAdapter.getStatus(this.workspace) === DevWorkspaceStatus.STOPPED;
  }

  get isStopping(): boolean {
    return WorkspaceAdapter.getStatus(this.workspace) === DevWorkspaceStatus.STOPPING;
  }

  get isRunning(): boolean {
    return WorkspaceAdapter.getStatus(this.workspace) === DevWorkspaceStatus.RUNNING;
  }

  get hasError(): boolean {
    const devWorkspaceStatus = WorkspaceAdapter.getStatus(this.workspace);
    return (
      devWorkspaceStatus === DevWorkspaceStatus.FAILED ||
      devWorkspaceStatus === DevWorkspaceStatus.FAILING
    );
  }

  get error(): string | undefined {
    if (!this.hasError) {
      return;
    }
    return this.workspace.status?.message;
  }

  get ideUrl(): string | undefined {
    return this.workspace.status?.mainUrl;
  }

  get storageType(): che.WorkspaceStorageType {
    return (this.workspace.spec.template?.attributes?.[DEVWORKSPACE_STORAGE_TYPE_ATTR] ||
      '') as che.WorkspaceStorageType;
  }

  set storageType(type: che.WorkspaceStorageType) {
    if (type) {
      if (!this.workspace.spec.template.attributes) {
        this.workspace.spec.template.attributes = {};
      }
      this.workspace.spec.template.attributes[DEVWORKSPACE_STORAGE_TYPE_ATTR] = type;
    } else {
      if (this.workspace.spec.template.attributes?.[DEVWORKSPACE_STORAGE_TYPE_ATTR]) {
        delete this.workspace.spec.template.attributes[DEVWORKSPACE_STORAGE_TYPE_ATTR];
        if (Object.keys(this.workspace.spec.template.attributes).length === 0) {
          delete this.workspace.spec.template.attributes;
        }
      }
    }
  }

  get projects(): string[] {
    const template = this.workspace.spec.template;
    if (!template) {
      return [];
    }
    const projects = template.projects || [];
    if (projects.length > 0) {
      return projects.map(project => project.name);
    }
    const starterProjectName = template.attributes?.['controller.devfile.io/use-starter-project'];
    if (starterProjectName && Array.isArray(template?.starterProjects)) {
      if (
        template.starterProjects.findIndex(
          starterProject => starterProject.name === starterProjectName,
        ) !== -1
      ) {
        return [starterProjectName];
      }
    }
    return [];
  }
}

export function constructWorkspace<T extends devfileApi.DevWorkspace>(workspace: T): Workspace {
  return new WorkspaceAdapter(workspace);
}
