/*
 * Copyright (c) 2018-2021 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import {
  devfileToDevWorkspace,
  devWorkspaceToDevfile,
} from '../workspace-client/devworkspace/converters';
import { attributesToType, typeToAttributes } from '../storageTypes';
import { DevWorkspaceStatus, WorkspaceStatus } from '../helpers/types';
import { DEVWORKSPACE_NEXT_START_ANNOTATION } from '../workspace-client/devworkspace/devWorkspaceClient';
import { getId, getStatus } from './helper';
import devfileApi, { isDevfileV2, isDevWorkspace } from '../devfileApi';
import { devWorkspaceKind } from '../devfileApi/devWorkspace';

export interface Workspace {
  readonly ref: che.Workspace | devfileApi.DevWorkspace;

  readonly id: string;
  name: string;
  readonly namespace: string;
  readonly infrastructureNamespace: string;
  readonly created: number;
  readonly updated: number;
  status: WorkspaceStatus | DevWorkspaceStatus;
  readonly ideUrl?: string;
  devfile: che.WorkspaceDevfile | devfileApi.Devfile;
  storageType: che.WorkspaceStorageType;
  readonly projects: string[];
  readonly isStarting: boolean;
  readonly isStopped: boolean;
  readonly isStopping: boolean;
  readonly isRunning: boolean;
  readonly hasError: boolean;
}

export class WorkspaceAdapter<T extends che.Workspace | devfileApi.DevWorkspace> implements Workspace {
  private workspace: T;

  constructor(workspace: T) {
    if (isCheWorkspace(workspace) || isDevWorkspace(workspace)) {
      this.workspace = workspace;
    } else {
      console.error('Unexpected workspace object shape:', workspace);
      throw new Error('Unexpected workspace object shape.');
    }
  }

  get ref(): T {
    return this.workspace;
  }

  get id(): string {
    if (isCheWorkspace(this.workspace)) {
      return this.workspace.id;
    } else {
      return getId(this.workspace as devfileApi.DevWorkspace);
    }
  }

  get name(): string {
    if (isCheWorkspace(this.workspace)) {
      return this.workspace.devfile.metadata.name || '';
    } else {
      return (this.workspace as devfileApi.DevWorkspace).metadata.name;
    }
  }

  set name(name: string) {
    if (isCheWorkspace(this.workspace)) {
      this.workspace.devfile.metadata.name = name;
    } else {
      console.error('Not implemented: set name of the devworkspace.');
    }
  }

  get namespace(): string {
    if (isCheWorkspace(this.workspace)) {
      return this.workspace.namespace || '';
    } else {
      return (this.workspace as devfileApi.DevWorkspace).metadata.namespace;
    }
  }

  get infrastructureNamespace(): string {
    if (isCheWorkspace(this.workspace)) {
      return this.workspace.attributes?.infrastructureNamespace || '';
    } else {
      return (this.workspace as devfileApi.DevWorkspace).metadata.namespace;
    }
  }

  /**
   * Returns a workspace creation time in ms
   */
  get created(): number {
    if (isCheWorkspace(this.workspace)) {
      if (this.workspace.attributes?.created) {
        // `created` is a Unix timestamp String
        return new Date(parseInt(this.workspace.attributes.created)).getTime();
      }
    } else {
      const reference = this.workspace as devfileApi.DevWorkspace;
      if (reference.metadata.creationTimestamp) {
        // `creationTimestamp` is a date time String
        return new Date(reference.metadata.creationTimestamp.toString()).getTime();
      }
    }
    return new Date().getTime();
  }

  /**
   * Returns a workspace last updated time in ms
   */
  get updated(): number {
    if (isCheWorkspace(this.workspace)) {
      return parseInt(this.workspace.attributes?.updated || '', 10) || 0;
    } else {
      return this.created;
    }
  }

  get status(): WorkspaceStatus | DevWorkspaceStatus {
    if (isCheWorkspace(this.workspace)) {
      return this.workspace.status as WorkspaceStatus;
    } else {
      return getStatus(this.workspace as devfileApi.DevWorkspace);
    }
  }

  get isStarting(): boolean {
    if (isCheWorkspace(this.workspace)) {
      return this.workspace.status as WorkspaceStatus === WorkspaceStatus.STARTING;
    } else {
      return getStatus(this.workspace as devfileApi.DevWorkspace) as DevWorkspaceStatus === DevWorkspaceStatus.STARTING;
    }
  }

  get isStopped(): boolean {
    if (isCheWorkspace(this.workspace)) {
      return this.workspace.status as WorkspaceStatus === WorkspaceStatus.STOPPED;
    } else {
      return getStatus(this.workspace as devfileApi.DevWorkspace) as DevWorkspaceStatus === DevWorkspaceStatus.STOPPED;
    }
  }

  get isStopping(): boolean {
    if (isCheWorkspace(this.workspace)) {
      return this.workspace.status as WorkspaceStatus === WorkspaceStatus.STOPPING;
    } else {
      return getStatus(this.workspace as devfileApi.DevWorkspace) as DevWorkspaceStatus === DevWorkspaceStatus.STOPPING;
    }
  }

  get isRunning(): boolean {
    if (isCheWorkspace(this.workspace)) {
      return this.workspace.status as WorkspaceStatus === WorkspaceStatus.RUNNING;
    } else {
      return getStatus(this.workspace as devfileApi.DevWorkspace) as DevWorkspaceStatus === DevWorkspaceStatus.RUNNING;
    }
  }

  get hasError(): boolean {
    if (isCheWorkspace(this.workspace)) {
      return this.workspace.status as WorkspaceStatus === WorkspaceStatus.ERROR;
    } else {
      return getStatus(this.workspace as devfileApi.DevWorkspace) as DevWorkspaceStatus === DevWorkspaceStatus.FAILED;
    }
  }

  get ideUrl(): string | undefined {
    if (isCheWorkspace(this.workspace)) {
      const runtime = this.workspace.runtime;
      if (!runtime || !runtime.machines) {
        return;
      }
      for (const machineName of Object.keys(runtime.machines)) {
        const servers = runtime.machines[machineName].servers || {};
        for (const serverId of Object.keys(servers)) {
          const attributes = (servers[serverId] as any).attributes;
          if (attributes && attributes['type'] === 'ide') {
            return servers[serverId].url;
          }
        }
      }
    } else {
      return (this.workspace as devfileApi.DevWorkspace)?.status?.mainUrl;
    }
  }

  get storageType(): che.WorkspaceStorageType {
    if (isCheWorkspace(this.workspace)) {
      return attributesToType(this.workspace.devfile.attributes);
    } else {
      console.error('Not implemented: get storage type of the devworkspace.');
      return attributesToType(undefined);
    }
  }

  set storageType(type: che.WorkspaceStorageType) {
    if (isCheWorkspace(this.workspace)) {
      const attributes = typeToAttributes(type);
      if (!this.workspace.devfile.attributes) {
        this.workspace.devfile.attributes = {};
      } else {
        delete this.workspace.devfile.attributes.asyncPersist;
        delete this.workspace.devfile.attributes.persistVolumes;
      }
      if (attributes) {
        Object.assign(this.workspace.devfile.attributes, attributes);
      }
      if (Object.keys(this.workspace.devfile.attributes).length === 0) {
        delete this.workspace.devfile.attributes;
      }
    } else {
      console.error('Not implemented: set storage type of the devworkspace.');
    }
  }

  get devfile(): che.WorkspaceDevfile | devfileApi.Devfile {
    if (isCheWorkspace(this.workspace)) {
      return this.workspace.devfile as T extends che.Workspace ? che.WorkspaceDevfile : devfileApi.Devfile;
    } else {
      const currentWorkspace = this.workspace as devfileApi.DevWorkspace;
      if (currentWorkspace.metadata.annotations && currentWorkspace.metadata.annotations[DEVWORKSPACE_NEXT_START_ANNOTATION]) {
        const devfile = devWorkspaceToDevfile(JSON.parse(currentWorkspace.metadata.annotations[DEVWORKSPACE_NEXT_START_ANNOTATION]));
        if (isDevfileV2(devfile)) {
          return devfile;
        }
      }
      return devWorkspaceToDevfile(currentWorkspace) as devfileApi.Devfile;
    }
  }

  set devfile(devfile: che.WorkspaceDevfile | devfileApi.Devfile) {
    if (isCheWorkspace(this.workspace)) {
      this.workspace.devfile = devfile as che.WorkspaceDevfile;
    } else {
      const workspace = this.workspace as devfileApi.DevWorkspace;
      const converted = devfileToDevWorkspace(
        devfile as devfileApi.Devfile,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        workspace.spec.routingClass!,
        workspace.spec.started
      );
      if (isDevWorkspace(converted)) {
        (this.workspace as devfileApi.DevWorkspace) = converted;
      } else {
        console.error(`WorkspaceAdapter: the received devworkspace either has wrong "kind" (not ${devWorkspaceKind}) or lacks some of mandatory fields: `, converted);
        throw new Error('Unexpected error happened. Please check the Console tab of Developer tools.');
      }
    }
  }

  get projects(): string[] {
    if (isCheWorkspace(this.workspace)) {
      return (this.workspace.devfile.projects || [])
        .map(project => project.name);
    } else {
      const devfile = devWorkspaceToDevfile(this.workspace as devfileApi.DevWorkspace);
      return (devfile.projects || [])
        .map(project => project.name);
    }
  }

}

export function convertWorkspace<T extends che.Workspace | devfileApi.DevWorkspace>(workspace: T): Workspace {
  return new WorkspaceAdapter(workspace);
}

export function isCheWorkspace(workspace: che.Workspace | devfileApi.DevWorkspace): workspace is che.Workspace {
  return (workspace as che.Workspace).id !== undefined
    && (workspace as che.Workspace).devfile !== undefined
    && (workspace as che.Workspace).status !== undefined;
}

export function isCheDevfile(devfile: che.WorkspaceDevfile | devfileApi.Devfile): devfile is che.WorkspaceDevfile {
  return !isDevfileV2(devfile);
}
