/*
 * Copyright (c) 2018-2024 Red Hat, Inc.
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
  V1alpha2DevWorkspace,
  V1alpha2DevWorkspaceTemplate,
  V230Devfile,
  V230DevfileComponents,
} from '@devfile/api';
import { api, Architecture } from '@eclipse-che/common';
import * as k8s from '@kubernetes/client-node';
import { IncomingHttpHeaders } from 'http';

import { MessageListener } from '@/services/types/Observer';

/**
 * Holds the methods for working with dockerconfig for devworkspace
 * which is stored in Kubernetes Secret and is annotated in DevWorkspace operator specific way.
 */
export interface IDockerConfigApi {
  /**
   * Get DockerConfig in the specified namespace
   */
  read(namespace: string): Promise<api.IDockerConfig>;

  /**
   * Replace DockerConfig in the specified namespace
   */
  update(namespace: string, dockerCfg: api.IDockerConfig): Promise<api.IDockerConfig>;
}

export interface IGitConfigApi {
  /**
   * Read gitconfig from configmap in the specified namespace
   */
  read(namespace: string): Promise<api.IGitConfig>;

  /**
   * Replace gitconfig in configmap in the specified namespace
   */
  patch(namespace: string, gitconfig: api.IGitConfig): Promise<api.IGitConfig>;
}

export interface IDevWorkspaceClusterApi {
  /**
   * Checks if the limit of concurrent running DevWorkspaces by all users is exceeded.
   */
  isRunningWorkspacesClusterLimitExceeded(): Promise<boolean>;

  /**
   * Watch DevWorkspaces in all namespaces.
   */
  watchInAllNamespaces(): Promise<void>;
}

export interface IDevWorkspaceApi extends IWatcherService<api.webSocket.SubscribeParams> {
  /**
   * Get the DevWorkspace with given namespace in the specified namespace
   */
  getByName(namespace: string, name: string): Promise<V1alpha2DevWorkspace>;

  /**
   * Get list of DevWorkspaces in the given namespace
   */
  listInNamespace(namespace: string): Promise<api.IDevWorkspaceList>;

  /**
   * Create a DevWorkspace based on the specified configuration.
   */
  create(
    devWorkspace: V1alpha2DevWorkspace,
    namespace: string,
  ): Promise<{ devWorkspace: V1alpha2DevWorkspace; headers: Partial<IncomingHttpHeaders> }>;

  /**
   * Delete the DevWorkspace with given name in the specified namespace
   */
  delete(namespace: string, name: string): Promise<void>;

  /**
   * Patches the DevWorkspace with given name in the specified namespace
   */
  patch(
    namespace: string,
    name: string,
    patches: api.IPatch[],
  ): Promise<{ devWorkspace: V1alpha2DevWorkspace; headers: Partial<IncomingHttpHeaders> }>;
}

export interface IEventApi extends IWatcherService<api.webSocket.SubscribeParams> {
  /**
   * Get list of Events in the given namespace
   */
  listInNamespace(namespace: string): Promise<api.IEventList>;
}

export interface IPodApi extends IWatcherService<api.webSocket.SubscribeParams> {
  /**
   * Get list of Pods in the given namespace
   */
  listInNamespace(namespace: string): Promise<api.IPodList>;
}

export type ILogsApi = IWatcherService<api.webSocket.SubscribeLogsParams>;

export interface IDevWorkspaceTemplateApi {
  listInNamespace(namespace: string): Promise<V1alpha2DevWorkspaceTemplate[]>;
  getByName(namespace: string, name: string): Promise<V1alpha2DevWorkspaceTemplate>;
  patch(
    namespace: string,
    name: string,
    patches: api.IPatch[],
  ): Promise<V1alpha2DevWorkspaceTemplate>;
  delete(namespace: string, name: string): Promise<void>;
  create(template: V1alpha2DevWorkspaceTemplate): Promise<V1alpha2DevWorkspaceTemplate>;
}

export type CustomResourceDefinitionList = k8s.V1CustomResourceDefinitionList & {
  items?: CheClusterCustomResource[];
};

export type CheClusterCustomResource = k8s.V1CustomResourceDefinition & {
  spec: {
    devEnvironments?: CheClusterCustomResourceSpecDevEnvironments;
    components?: CheClusterCustomResourceSpecComponents;
    networking?: {
      auth?: {
        advancedAuthorization?: api.IAdvancedAuthorization;
      };
    };
  };
  status: {
    pluginRegistryURL: string;
  };
};

export function isCheClusterCustomResource(object: unknown): object is CheClusterCustomResource {
  if (typeof object !== 'object' || object === null) {
    return false;
  }

  const { spec, status } = object as CheClusterCustomResource;
  return (
    spec !== undefined &&
    status !== undefined &&
    (isCheClusterCustomResourceSpecDevEnvironments(spec.devEnvironments) ||
      isCheClusterCustomResourceSpecComponent(spec.components))
  );
}

export type CheClusterCustomResourceSpecDevEnvironments = {
  containerBuildConfiguration?: {
    openShiftSecurityContextConstraint?: string;
  };
  defaultComponents?: V230DevfileComponents[];
  defaultNamespace?: {
    autoProvision?: boolean;
    template?: string;
  };
  defaultEditor?: string;
  defaultPlugins?: api.IWorkspacesDefaultPlugins[];
  disableContainerBuildCapabilities?: boolean;
  secondsOfInactivityBeforeIdling: number;
  secondsOfRunBeforeIdling?: number;
  startTimeoutSeconds?: number;
  storage?: {
    pvcStrategy?: string;
  };
  maxNumberOfRunningWorkspacesPerUser?: number;
  maxNumberOfRunningWorkspacesPerCluster?: number;
  maxNumberOfWorkspacesPerUser?: number;
  allowedSources?: {
    urls?: string[];
  };
};

export function isCheClusterCustomResourceSpecDevEnvironments(
  object: unknown,
): object is CheClusterCustomResourceSpecDevEnvironments {
  if (typeof object !== 'object' || object === null) {
    return false;
  }

  const {
    containerBuildConfiguration,
    defaultComponents,
    defaultEditor,
    defaultPlugins,
    disableContainerBuildCapabilities,
    secondsOfInactivityBeforeIdling,
    secondsOfRunBeforeIdling,
    startTimeoutSeconds,
    storage,
    maxNumberOfRunningWorkspacesPerUser,
    maxNumberOfRunningWorkspacesPerCluster,
    maxNumberOfWorkspacesPerUser,
  } = object as CheClusterCustomResourceSpecDevEnvironments;
  return (
    containerBuildConfiguration !== undefined ||
    defaultComponents !== undefined ||
    defaultEditor !== undefined ||
    defaultPlugins !== undefined ||
    disableContainerBuildCapabilities !== undefined ||
    secondsOfInactivityBeforeIdling !== undefined ||
    secondsOfRunBeforeIdling !== undefined ||
    startTimeoutSeconds !== undefined ||
    storage !== undefined ||
    maxNumberOfRunningWorkspacesPerUser !== undefined ||
    maxNumberOfRunningWorkspacesPerCluster !== undefined ||
    maxNumberOfWorkspacesPerUser !== undefined
  );
}

export type CheClusterCustomResourceSpecComponents = {
  cheServer?: Record<string, unknown>;
  dashboard?: {
    deployment?: {
      containers: {
        env?: Array<{
          name: string;
          value: string;
        }>;
      }[];
    };
    requestTimeout?: number;
    branding?: {
      logo?: {
        base64data: string;
        mediatype: string;
      };
    };
    headerMessage?: {
      show?: boolean;
      text?: string;
    };
    logLevel?: string;
  };
  devWorkspace?: {
    runningLimit?: number;
  };
  pluginRegistry?: api.IPluginRegistry;
  devfileRegistry?: {
    disableInternalRegistry?: boolean;
    externalDevfileRegistries?: api.IExternalDevfileRegistry[];
  };
};

export function isCheClusterCustomResourceSpecComponent(
  object: unknown,
): object is CheClusterCustomResourceSpecComponents {
  if (typeof object !== 'object' || object === null) {
    return false;
  }

  const { cheServer, dashboard, devWorkspace, pluginRegistry, devfileRegistry } =
    object as CheClusterCustomResourceSpecComponents;
  return (
    cheServer !== undefined ||
    dashboard !== undefined ||
    devWorkspace !== undefined ||
    pluginRegistry !== undefined ||
    devfileRegistry !== undefined
  );
}

export interface IServerConfigApi {
  /**
   * Returns custom resource
   */
  fetchCheCustomResource(): Promise<CheClusterCustomResource>;
  /**
   * Returns the container build capabilities and configuration.
   */
  getContainerBuild(
    cheCustomResource: CheClusterCustomResource,
  ): Pick<
    CheClusterCustomResourceSpecDevEnvironments,
    'containerBuildConfiguration' | 'disableContainerBuildCapabilities'
  >;
  /**
   * Returns default plugins
   */
  getDefaultPlugins(cheCustomResource: CheClusterCustomResource): api.IWorkspacesDefaultPlugins[];
  /**
   * Returns the plugin registry URL.
   */
  getDefaultPluginRegistryUrl(cheCustomResource: CheClusterCustomResource): string;
  /**
   * Returns the default editor to workspace create with. It could be a plugin ID or a URI.
   */
  getDefaultEditor(cheCustomResource: CheClusterCustomResource): string | undefined;
  /**
   * Returns the default components applied to DevWorkspaces.
   * These default components are meant to be used when a Devfile does not contain any components.
   */
  getDefaultComponents(cheCustomResource: CheClusterCustomResource): V230DevfileComponents[];
  /**
   * Returns the plugin registry.
   */
  getPluginRegistry(cheCustomResource: CheClusterCustomResource): api.IPluginRegistry;
  /**
   * Returns the internal registry disable status.
   */
  getInternalRegistryDisableStatus(cheCustomResource: CheClusterCustomResource): boolean;
  /**
   * Returns the external devfile registries.
   */
  getExternalDevfileRegistries(
    cheCustomResource: CheClusterCustomResource,
  ): api.IExternalDevfileRegistry[];
  /**
   * Returns the PVC strategy if it is defined.
   */
  getPvcStrategy(cheCustomResource: CheClusterCustomResource): string | undefined;
  /**
   * Returns a maintenance warning.
   */
  getDashboardWarning(cheCustomResource: CheClusterCustomResource): string | undefined;

  /**
   * Returns limit of running workspaces per user.
   */
  getRunningWorkspacesLimit(cheCustomResource: CheClusterCustomResource): number;

  /**
   * Returns limit of running workspaces by all users.
   */
  getRunningWorkspacesClusterLimit(cheCustomResource: CheClusterCustomResource): number;

  /**
   * Returns the total number of workspaces, both stopped and running, that a user can keep.
   */
  getAllWorkspacesLimit(cheCustomResource: CheClusterCustomResource): number;

  /**
   * Returns the workspace inactivity timeout
   */
  getWorkspaceInactivityTimeout(cheCustomResource: CheClusterCustomResource): number;

  /**
   * Returns the workspace run timeout
   */
  getWorkspaceRunTimeout(cheCustomResource: CheClusterCustomResource): number;

  /**
   * Returns the workspace start timeout
   */
  getWorkspaceStartTimeout(cheCustomResource: CheClusterCustomResource): number;

  /**
   * Returns the axios request timeout
   */
  getAxiosRequestTimeout(): number;

  /**
   * Returns the dashboard branding logo
   */
  getDashboardLogo(
    cheCustomResource: CheClusterCustomResource,
  ): { base64data: string; mediatype: string } | undefined;

  /**
   * Returns the advancedAuthorization value
   */
  getAdvancedAuthorization(
    cheCustomResource: CheClusterCustomResource,
  ): api.IAdvancedAuthorization | undefined;

  /**
   * Returns the autoProvision value
   */
  getAutoProvision(cheCustomResource: CheClusterCustomResource): boolean;

  /**
   * Returns the allowed source URLs
   */
  getAllowedSourceUrls(cheCustomResource: CheClusterCustomResource): string[];

  /**
   * Returns the showDeprecatedEditors value
   */
  getShowDeprecatedEditors(cheCustomResource: CheClusterCustomResource): boolean;

  /**
   * Returns the hideEditorsById value
   */
  gеtHideEditorsById(cheCustomResource: CheClusterCustomResource): string[];

  /**
   * Returns the Machine (hardware) type.
   * The value is determined by executing the `uname -m` command.
   */
  getCurrentArchitecture(): Promise<Architecture | undefined>;
}

export interface IKubeConfigApi {
  /**
   * Inject the kubeconfig into all containers with the given devworkspaceId in a namespace.
   */
  injectKubeConfig(namespace: string, devworkspaceId: string): Promise<void>;
}

export interface IPodmanApi {
  /**
   * Executes the 'podman login' command to the OpenShift internal registry.
   */
  podmanLogin(namespace: string, devworkspaceId: string): Promise<void>;
}

export interface IUserProfileApi {
  /**
   * Returns user profile object that contains username and email.
   */
  getUserProfile(namespace: string): Promise<api.IUserProfile | undefined>;
}

export interface IWorkspacePreferencesApi {
  /**
   * Returns workspace preferences object that contains skip-authorisation info.
   */
  getWorkspacePreferences(namespace: string): Promise<api.IWorkspacePreferences>;

  /**
   * Removes the target provider from skip-authorisation property from the workspace preferences object.
   */
  removeProviderFromSkipAuthorizationList(
    namespace: string,
    provider: api.GitProvider,
  ): Promise<void>;

  /**
   * Updates list of trusted sources in the workspace preferences object.
   */
  addTrustedSource(
    namespace: string,
    source: api.TrustedSourceAll | api.TrustedSourceUrl,
  ): Promise<void>;

  /**
   * Removes all trusted sources from the workspace preferences object.
   */
  removeTrustedSources(namespace: string): Promise<void>;
}

export interface IPersonalAccessTokenApi {
  /**
   * Reads all the PAT secrets from the specified namespace.
   */
  listInNamespace(namespace: string): Promise<Array<api.PersonalAccessToken>>;

  /**
   * Creates a PAT secret.
   */
  create(
    namespace: string,
    personalAccessToken: api.PersonalAccessToken,
  ): Promise<api.PersonalAccessToken>;

  /**
   * "Updates" an existing PAT secret.
   */
  replace(
    namespace: string,
    personalAccessToken: api.PersonalAccessToken,
  ): Promise<api.PersonalAccessToken>;

  /**
   * Deletes a PAT secret.
   */
  delete(namespace: string, name: string): Promise<void>;
}

export interface IDevWorkspaceClient {
  devWorkspaceTemplateApi: IDevWorkspaceTemplateApi;
  devworkspaceApi: IDevWorkspaceApi;
  dockerConfigApi: IDockerConfigApi;
  eventApi: IEventApi;
  kubeConfigApi: IKubeConfigApi;
  logsApi: ILogsApi;
  personalAccessTokenApi: IPersonalAccessTokenApi;
  podApi: IPodApi;
  serverConfigApi: IServerConfigApi;
  userProfileApi: IUserProfileApi;
  gitConfigApi: IGitConfigApi;
  gettingStartedSampleApi: IGettingStartedSampleApi;
  airGapSampleApi: IAirGapSampleApi;
  sshKeysApi: IShhKeysApi;
  workspacePreferencesApi: IWorkspacePreferencesApi;
  editorsApi: IEditorsApi;
}

export interface IDevWorkspaceSingletonClient {
  devWorkspaceClusterServiceApi: IDevWorkspaceClusterApi;
}

export interface IWatcherService<T = Record<string, unknown>> {
  /**
   * Listen to objects changes in the given namespace
   * @param listener callback will be invoked when change happens
   * @param params optional parameters, e.g. `resourceVersion` to start watching from a specific version
   */
  watchInNamespace(listener: MessageListener, params: T): Promise<void>;

  /**
   * Stop watching objects changes in the given namespace
   */
  stopWatching(): void;
}

export interface IGettingStartedSampleApi {
  /**
   * Reads all the Getting Started Samples ConfigMaps.
   */
  list(): Promise<Array<api.IGettingStartedSample>>;
}

export interface IAirGapSampleApi {
  /**
   * Reads all the Air Gap samples.
   */
  list(): Promise<Array<api.IAirGapSample>>;

  /**
   * Downloads the Air Gap sample project by its id.
   */
  downloadProject(id: string): Promise<api.IStreamedFile>;

  /**
   * Reads the devfile content of the Air Gap sample by its id.
   */
  downloadDevfile(id: string): Promise<api.IStreamedFile>;
}

export interface IEditorsApi {
  /**
   * Reads all Editors from ConfigMaps.
   */
  list(): Promise<Array<V230Devfile>>;

  /**
   * Returns an Editor from ConfigMap by its editorId.
   * @param id editorId in the format of publisher/name/version
   * @throws EditorNotFoundError if editor is not found
   */
  get(id: string): Promise<V230Devfile>;
}

export interface IShhKeysApi {
  list(namespace: string): Promise<Array<api.SshKey>>;
  add(namespace: string, sshKey: api.SshKey): Promise<api.SshKey>;
  delete(namespace: string, name: string): Promise<void>;
}
