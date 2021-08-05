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

declare namespace models {

  export interface NamespacedParam {
    namespace: string;
  }

  export interface NamespacedWorkspaceParam extends NamespacedParam {
    workspaceName: string;
  }

  export interface DevfileStartedBody {
    devfile: any;
    started: boolean;
  }

  export interface TemplateStartedBody {
    template: any;
  }

  export interface IStatusUpdate {
    error?: string;
    message?: string;
    status?: string;
    prevStatus?: string;
    workspaceId: string;
  }

  export enum DevWorkspaceStatus {
    FAILED = 'Failed',
    STARTING = 'Starting',
    TERMINATING = 'Terminating',
    RUNNING = 'Running',
    STOPPED = 'Stopped',
    STOPPING = 'Stopping'
  }

  export interface ISchemaParams {
    [key: string]: any
  }
}

declare module 'models' {
  export = models;
}
