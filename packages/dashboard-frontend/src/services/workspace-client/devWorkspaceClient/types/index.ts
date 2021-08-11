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

export interface IDevWorkspace {
    apiVersion: string;
    kind: string;
    metadata: {
        name: string;
        namespace: string;
        creationTimestamp?: string;
        deletionTimestamp?: string;
        uid?: string;
        annotations?: any;
    };
    spec: IDevWorkspaceSpec;
    status: {
        mainUrl: string;
        phase: string;
        devworkspaceId: string;
        message?: string;
    };
}

export interface IDevWorkspaceSpec {
    started: boolean;
    routingClass: string;
    template: {
        projects?: any;
        components?: any[];
        commands?: any;
        events?: any;
    };
}

export interface IDevWorkspaceDevfile {
    schemaVersion: string;
    metadata: {
        name: string;
        namespace: string;
        attributes?: { [key: string]: any };
    };
    projects?: any;
    components?: any;
    commands?: any;
    events?: any;
}
export interface IOwnerRefs {
  apiVersion: string;
  kind: string;
  name: string;
  uid: string;
}

export interface IDevWorkspaceTemplate {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace: string;
    ownerReferences: IOwnerRefs[];
  };
  spec: IDevWorkspaceDevfile;
}

export interface IPatch {
  op: string;
  path: string;
  value?: any;
}
