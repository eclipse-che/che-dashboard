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

export interface IDevWorkspaceApi {
    /**
     * Get the DevWorkspace with given namespace in the specified namespace
     */
    getByName(namespace: string, name: string): Promise<IDevWorkspace>;

    /**
     * Get list of devworkspaces in the given namespace
     */
    listInNamespace(namespace: string): Promise<IDevWorkspaceList>;

    /**
     * Listen to all DevWorkspaces changes in the given namespace
     * @param namespace namespace where to listen to DevWorkspaces changes
     * @param callbacks callback will be invoked when change happens
     */
    watchInNamespace(namespace: string, callbacks: IDevWorkspaceCallbacks): Promise<{ abort: Function }>;

    /**
     * Create a devworkspace based on the specified configuration.
     */
    create(
        devfile: IDevWorkspaceDevfile,
        routingClass: string,
        started?: boolean,
    ): Promise<IDevWorkspace>;

    /**
     * Updates the DevWorkspace with the given configuration
     */
    update(devworkspace: IDevWorkspace): Promise<IDevWorkspace>;

    /**
     * Delete the DevWorkspace with given name in the specified namespace
     */
    delete(namespace: string, name: string): Promise<void>;

    /**
     * Patches the DevWorkspace with given name in the specified namespace
     */
    patch(namespace: string, name: string, patches: IPatch[]): Promise<IDevWorkspace>;
}

export interface IDevWorkspaceTemplateApi {
    listInNamespace(namespace: string): Promise<IDevWorkspaceTemplate[]>;
    getByName(namespace: string, name: string): Promise<IDevWorkspaceTemplate>;
    delete(namespace: string, name: string): Promise<void>;
    create(template: IDevWorkspaceTemplate): Promise<IDevWorkspaceTemplate>;
}

export type IDevWorkspaceCallbacks = {
    onModified: (workspace: IDevWorkspace) => void;
    onDeleted: (workspaceId: string) => void;
    onAdded: (workspace: IDevWorkspace) => void;
    onError: (error: string) => void;
};

export interface IDevWorkspaceClient {
    devworkspaceApi: IDevWorkspaceApi;
    templateApi: IDevWorkspaceTemplateApi;
    cheApi: ICheApi;
    isDevWorkspaceApiEnabled(): Promise<boolean>;
}

// deprecated!
// see for details https://github.com/eclipse/che/issues/20167
export interface ICheApi {
    // deprecated!
    // see for details https://github.com/eclipse/che/issues/20167
    initializeNamespace(namespace: string): Promise<void>;
}

export interface IDevWorkspaceList {
    apiVersion: string;
    kind: string;
    metadata: {
        resourceVersion?: string;
    };
    items: IDevWorkspace[];
}

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

export interface IOwnerRefs {
    apiVersion: string;
    kind: string;
    name: string;
    uid: string;
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

export interface IPatch {
    op: string;
    path: string;
    value?: any;
}
