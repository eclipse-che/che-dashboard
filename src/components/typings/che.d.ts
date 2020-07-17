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
declare module 'che' {
  export = che;
}

declare namespace che {

  export type ConfigurableMenuItem = 'administration' | 'factories' | 'getstarted' | 'organizations' | 'stacks';

  export interface IRootScopeService extends ng.IRootScopeService {
    hideLoader: boolean;
    showIDE: boolean;
    hideNavbar: boolean;
    wantTokeepLoader: boolean;
    waitingLoaded: boolean;
    currentPage: string;
    productVersion: string;
    branding: any;
    globalWarningMessages: string[];
    showGlobalWarningBanner: boolean;
    closeGlobalWarningMessage: (message: string) => void;
  }

  export namespace api {

    export interface ICheResourcesDistribution {
      distributeResources(organizationId: string, resources: Array<any>): ng.IPromise<any>;
      updateTotalResources(organizationId: string, resources: Array<any>): ng.IPromise<any>;
      fetchOrganizationResources(organizationId: string): ng.IPromise<any>;
      getOrganizationResources(organizationId: string): any;
      fetchTotalOrganizationResources(organizationId: string): ng.IPromise<any>;
      getTotalOrganizationResources(organizationId: string): any;
      fetchUsedOrganizationResources(organizationId: string): ng.IPromise<any>;
      getUsedOrganizationResources(organizationId: string): any;
      fetchAvailableOrganizationResources(organizationId: string): ng.IPromise<any>;
      getAvailableOrganizationResources(organizationId: string): any;
      getOrganizationTotalResourceByType(organizationId: string, type: che.resource.resourceLimits): any;
      getOrganizationAvailableResourceByType(organizationId: string, type: che.resource.resourceLimits): any;
      getOrganizationResourceByType(organizationId: string, type: che.resource.resourceLimits): any;
      setOrganizationResourceLimitByType(resources: any, type: che.resource.resourceLimits, value: string): any;
    }

    export interface ICheOrganization {
      fetchOrganizationByName(name: string): ng.IPromise<che.IOrganization>;
      fetchSubOrganizationsById(id: string): ng.IPromise<Array<che.IOrganization>>;
      fetchOrganizations(maxItems?: number): ng.IPromise<Array<che.IOrganization>>;
      fetchOrganizationPageObjects(pageKey?: string): ng.IPromise<any>;
      getPageInfo(): IPageInfo;
      fetchUserOrganizations(userId: string, maxItems?: number): ng.IPromise<Array<che.IOrganization>>;
      fetchUserOrganizationPageObjects(userId: string, pageKey: string): ng.IPromise<any>;
      getUserOrganizations(userId: string): Array<che.IOrganization>;
      getUserOrganizationPageInfo(userId: string): IPageInfo;
      getUserOrganizationRequestData(userId: string): IRequestData;
      getOrganizations(): Array<che.IOrganization>;
      fetchOrganizationById(id: string): ng.IPromise<che.IOrganization>;
      getOrganizationById(id: string): che.IOrganization;
      getOrganizationByName(name: string): che.IOrganization;
      createOrganization(name: string, parentId?: string): ng.IPromise<any>;
      deleteOrganization(id: string): ng.IPromise<any>;
      updateOrganization(organization: che.IOrganization): ng.IPromise<any>;
      getRolesFromActions(actions: Array<string>): Array<IRole>;
      getActionsFromRoles(roles: Array<IRole>): Array<string>;
      getPersonalAccount(): che.IOrganization;
      processOrganizationInfoRetriever(organizations: Array<che.IOrganization>): void;
    }

    interface ISystemPermissions {
      actions: Array<string>;
    }

    export interface IChePermissions {
      storePermissions(data: any): ng.IPromise<any>;
      fetchOrganizationPermissions(organizationId: string): ng.IPromise<any>;
      getOrganizationPermissions(organizationId: string): any;
      removeOrganizationPermissions(organizationId: string, userId: string): ng.IPromise<any>;
      fetchWorkspacePermissions(workspaceId: string): ng.IPromise<any>;
      getWorkspacePermissions(workspaceId: string): any;
      removeWorkspacePermissions(workspaceId: string, userId: string): ng.IPromise<any>;
      fetchSystemPermissions(): ng.IPromise<any>;
      getSystemPermissions(): ISystemPermissions;
      getUserServices(): IUserServices;
      getPermissionsServicePath(): string;
    }

    export interface ICheTeam {
      fetchTeams(): ng.IPromise<any>;
      processTeams(teams: Array<che.ITeam>, user: che.IUser): void;
      getPersonalAccount(): che.ITeam;
      getTeams(): Array<che.ITeam>;
      fetchTeamById(id: string): ng.IPromise<che.ITeam>;
      fetchTeamByName(name: string): ng.IPromise<che.ITeam>;
      getTeamByName(name: string): che.ITeam;
      getTeamById(id: string): che.ITeam;
      createTeam(name: string): ng.IPromise<any>;
      deleteTeam(id: string): ng.IPromise<any>;
      updateTeam(team: any): ng.IPromise<che.ITeam>;
      getRolesFromActions(actions: Array<string>): Array<any>;
      getActionsFromRoles(roles: Array<any>): Array<string>;
      getTeamDisplayName(team: any): string;
    }

    export interface ICheTeamEventsManager {
      subscribeTeamNotifications(teamId: string): void;
      subscribeTeamMemberNotifications(): void;
      unSubscribeTeamNotifications(teamId: string): void;
      addRenameHandler(handler: Function): void;
      removeRenameHandler(handler: Function): void;
      addDeleteHandler(handler: Function): void;
      removeDeleteHandler(handler: Function): void;
      addNewTeamHandler(handler: Function): void;
      processRenameTeam(info: any): void;
      processAddedToTeam(info: any): void;
      processDeleteTeam(info: any): void;
      processDeleteMember(info: any): void;
      isCurrentUser(name: string): boolean;
    }

    export interface ICheInvite {
      inviteToTeam(teamId: string, email: string, actions: Array<string>): ng.IPromise<any>;
      fetchTeamInvitations(teamId: string): ng.IPromise<any>;
      getTeamInvitations(teamId: string): Array<any>;
      deleteTeamInvitation(teamId: string, email: string);
    }

    export interface ICheDevfile {
      fetchDevfileSchema(): ng.IPromise<any>;
    }

    export interface ICheKubernetesNamespace {
      fetchKubernetesNamespace(): ng.IPromise<IKubernetesNamespace[]>;
      isPlaceholder(namespace: che.IKubernetesNamespace): boolean;
      containsPlaceholder(): boolean;
      getHintDescription(): string;
    }

  }

  export namespace resource {

    export type resourceLimits = string;
    export interface ICheResourceLimits {
      RAM: resourceLimits;
      WORKSPACE: resourceLimits;
      RUNTIME: resourceLimits;
      TIMEOUT: resourceLimits;
    }

    export type organizationActions = string;
    export interface ICheOrganizationActions {
      UPDATE: organizationActions;
      DELETE: organizationActions;
      SET_PERMISSIONS: organizationActions;
      MANAGE_RESOURCES: organizationActions;
      CREATE_WORKSPACES: organizationActions;
      MANAGE_WORKSPACES: organizationActions;
      MANAGE_SUB_ORGANIZATION: organizationActions;
    }

    export interface ICheOrganizationRoles {
      MEMBER: IRole;
      ADMIN: IRole;
      getRoles(): Array<string>;
      getValues(): Array<IRole>;
    }

    export interface ICheTeamRoles {
      TEAM_MEMBER: any;
      TEAM_ADMIN: any;
      getValues(): any[];
    }

    export interface ICheMachineSourceTypes {
      TOOL: string;
      RECIPE: string;
      getValues(): Array<string>;
    }
  }

  export namespace service {

    export interface IResourcesService {
      getResourceLimits(): che.resource.ICheResourceLimits;
      getOrganizationActions(): che.resource.ICheOrganizationActions;
      getOrganizationRoles(): che.resource.ICheOrganizationRoles;
      getTeamRoles(): che.resource.ICheTeamRoles;
    }

  }

  export namespace route {

    export interface IRouteParamsService extends ng.route.IRouteParamsService {
      action: string;
      ideParams: string | string[];
      namespace: string;
      showLogs: string;
      workspaceName: string;
      tabName: string;
    }

    export interface IRoute extends ng.route.IRoute {
      title?: string | {(...args: any[]) : string};
    }

    export interface IRouteProvider extends ng.route.IRouteProvider {
      accessWhen?: (path: string, route: IRoute) => IRouteProvider;
      accessOtherWise?: (route: IRoute) => IRouteProvider;
    }
  }

  export namespace widget {

    export interface ICheListHelper {
      areAllItemsSelected: boolean;
      isNoItemSelected: boolean;
      itemsSelectionStatus: any;
      visibleItemsNumber: number;
      selectAllItems(): void;
      deselectAllItems(): void;
      changeBulkSelection(): void;
      updateBulkSelectionStatus(): void;
      getSelectedItems(): any[];
      getVisibleItems(): any[];
      setList(itemsList: any[], key: string, isSelectable?: (item: any) => boolean): void;
      applyFilter(name: string, ...filterProps: any[]);
      clearFilters(): void;
    }

    export interface ICheListHelperFactory {
      getHelper(id: string): ICheListHelper;
      removeHelper(id: string): void;
    }

  }

  export interface IUserServices {
    hasUserService: boolean;
    hasUserProfileService: boolean;
    hasAdminUserService: boolean;
    hasInstallationManagerService: boolean;
    hasLicenseService: boolean;
  }

  export type IComponentOptionsConstructor = (new (...args: any[]) => ng.IComponentOptions);

  export interface IRegisterService {
    app: ng.IModule;
    component(name: string, constructorFn: che.IComponentOptionsConstructor): IRegisterService;
    directive(name: string, constructorFn: Function);
    filter(name: string, constructorFn: ng.Injectable<ng.FilterFactory>): IRegisterService;
    controller(name: string, constructorFn: ng.Injectable<ng.IControllerConstructor>): IRegisterService;
    service(name: string, constructorFn: ng.Injectable<Function>): IRegisterService;
    provider(name: string, constructorFn: ng.IServiceProvider): IRegisterService;
    factory(name: string, constructorFn: ng.Injectable<Function>): IRegisterService;
  }

  export interface IWorkspaceCommand {
    name: string;
    type: string;
    commandLine: string;
    attributes?: {
      previewUrl?: string;
      [propName: string]: string;
    };
  }

  export interface IStack {
    id?: string;
    name: string;
    description?: string;
    tags?: Array<string>;
    creator?: string;
    scope?: string;
    components?: Array<any>;
    links?: Array<any>;
    workspaceConfig: IWorkspaceConfig;
  }

  export interface IStackLink {
    href: string;
    method: string;
    rel: string;
    parameters: any[];
  }

  export interface IWorkspace {
    id?: string;
    projects?: any;
    links?: {
      ide?: string
      [rel: string]: string;
    };
    temporary?: boolean;
    status?: string;
    namespace?: string;
    attributes?: IWorkspaceAttributes;
    config?: IWorkspaceConfig;
    devfile?: IWorkspaceDevfile;
    runtime?: IWorkspaceRuntime;
    isLocked?: boolean;
    usedResources?: string;
  }

  export interface IWorkspaceSettings {
    cheWorkspaceDevfileRegistryUrl?: string;
    cheWorkspacePluginRegistryUrl: string;
    'che.workspace.persist_volumes.default': 'false' | 'true';
    supportedRecipeTypes: string;
  }

  export interface IWorkspaceAttributes {
    created: number;
    updated?: number;
    stackId?: string;
    stackName?: string;
    factoryId?: string;
    factoryurl?: string;
    errorMessage?: string;
    infrastructureNamespace: string;
    [propName: string]: string | number;
  }

  export interface IWorkspaceConfig {
    name?: string;
    defaultEnv?: string;
    environments: {
      [envName: string]: any;
    };
    projects?: Array <any>;
    commands?: Array <any>;
    attributes?: IWorkspaceConfigAttributes;
  }

  export interface IWorkspaceConfigAttributes {
    persistVolumes?: 'false' | 'true'; // explicitly indicates turning the ephemeral mode on
    editor?: string;
    plugins?: string;
  }

  export interface IWorkspaceDevfile {
    apiVersion: string;
    components?: Array<any>;
    projects?: Array <any>;
    commands?: Array <any>;
    attributes?: che.IWorkspaceConfigAttributes;
    metadata: {
      name?: string;
      generateName?: string;
    }
  }

  export interface IWorkspaceRuntime {
    activeEnv: string;
    links: any[];
    machines: {
      [machineName: string]: IWorkspaceRuntimeMachine
    };
    owner: string;
    warnings: IWorkspaceWarning[];
    machineToken?: string;
  }

  export interface IWorkspaceWarning {
    code?: number;
    message: string;
  }

  export interface IWorkspaceRuntimeMachine {
    attributes: { [propName: string]: string };
    servers: { [serverName: string]: IWorkspaceRuntimeMachineServer };
  }

  export interface IWorkspaceRuntimeMachineServer {
    status: string;
    port: string;
    url: string;
    ref: string;
    protocol: string;
    path: string;
  }

  export interface IProjectSource {
    location: string;
    parameters?: {
      [paramName: string]: any
    };
    type?: string;
  }

  export interface IProjectTemplate {
    name: string;
    displayName?: string;
    description: string;
    source: IProjectSource;
    path?: string;
    commands?: Array<IWorkspaceCommand>;
    mixins?: Array<any>;
    modules?: Array<any>;
    problems?: Array<any>;
    projectType?: string;
    type?: string;
    tags?: Array<string>;
    category?: string;
    attributes?: any;
    options?: Array<any>;
    workspaceId?: string;
    workspaceName?: string;
    projects?: IProject[];
  }

  export interface IProject {
    name: string;
    type?: string;
    source: IProjectSource;
    workspaceId?: string;
    workspaceName?: string;
  }

  export interface IWorkspaceProjects {
    [workspaceId: string]: Array<IProject>;
  }

  export interface IImportProject {
    source: IProjectSource;
    project?: IProjectTemplate;
    projects?: IProjectTemplate[];
  }

  export interface IEditorOptions {
    mode: string;
    lineNumbers: string;
    wordWrap: string;
    matchBrackets: boolean;
    lineDecorationsWidth: number;
    lineNumbersMinChars: number;
  }

  export interface IValidation {
    isValid: boolean;
    errors: Array<string>;
  }

  export interface IProfileAttributes {
      firstName?: string;
      lastName?: string;
      [propName: string]: string | number;
  }

  export interface IProfile extends ng.resource.IResource<any> {
    attributes?: IProfileAttributes;
    email: string;
    links?: Array<any>;
    userId: string;
  }

  export interface INamespace {
    id: string;
    label: string;
    location: string;
  }

  export interface IUser {
    attributes: {
      firstName?: string;
      lastName?: string;
      [propName: string]: string | number;
    };
    id: string;
    name: string;
    email: string;
    aliases: Array<string>;
  }

  export interface IFactory {
    id: string;
    name?: string;
    v: string;
    workspace: IWorkspaceConfig;
    devfile?: IWorkspaceDevfile;
    creator: any;
    ide?: any;
    button?: any;
    policies?: any;
    links?: string[];
    source?: string;
  }

  export interface IRegistry {
    url: string;
    username: string;
    password: string;
  }

  interface IRequestData {
    userId?: string;
    maxItems?: string;
    skipCount?: string;
    [param: string]: string;
  }

  interface IPageInfo {
    countPages: number;
    currentPageNumber: number;
  }

  export interface IPermissions {
    actions: Array<string>;
    domainId: string;
    instanceId: string;
    userId: string;
  }

  export interface IRole {
    actions: Array<string>;
    description: string;
    title: string;
    name: string;
  }

  export interface IOrganization {
    id: string;
    links: Array<ILink>;
    name: string;
    parent?: string;
    qualifiedName: string;
  }

  export interface ITeam extends IOrganization { }

  export interface ILink {
    href: string;
    method: string;
    parameters: Array<any>;
    produces: string;
    rel: string;
  }

  export interface IResource {
    type: string;
    amount: number;
    unit: string;
  }

  export interface IMember extends che.IProfile {
    id: string;
    roles?: Array<IRole>;
    /**
     * Role name
     */
    role?: string;
    permissions?: IPermissions;
    name?: string;
    isPending?: boolean;
  }

  export interface IKubernetesNamespace {
    name: string;
    attributes: {
      default?: boolean;
      displayName?: string;
      phase: string;
    };
  }

}
