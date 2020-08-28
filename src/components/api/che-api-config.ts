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

import {CheAPI} from './che-api.factory';
import {CheWorkspace} from './workspace/che-workspace.factory';
import {CheFactory} from './che-factory.factory';
import {CheProfile} from './che-profile.factory';
import {ChePreferences} from './che-preferences.factory';
import {CheService} from './che-service.factory';
import {CheHttpBackendProviderFactory} from './test/che-http-backend-provider.factory';
import {CheFactoryTemplate} from './che-factory-template.factory';
import {CheHttpBackendFactory} from './test/che-http-backend.factory';
import {CheAPIBuilder} from './builder/che-api-builder.factory';
import {CheRemote} from './remote/che-remote.factory';
import {CheOAuthProvider} from './che-o-auth-provider.factory';
import {CheSsh} from './che-ssh.factory';
import {CheNamespaceRegistry} from './namespace/che-namespace-registry.factory';
import {CheUser} from './che-user.factory';
import {ChePageObject} from './paging-resource/page-object.factory';
import {CheJsonRpcApi} from './json-rpc/che-json-rpc-api.factory';
import {CheKeycloak} from './che-keycloak.factory';
import {CheOrganization} from './che-organizations.factory';
import {ChePermissions} from './che-permissions.factory';
import {CheResourcesDistribution} from './che-resources-distribution.factory';
import {CheTeam} from './che-team.factory';
import {CheTeamEventsManager} from './che-team-events-manager.factory';
import {CheInvite} from './che-invite.factory';
import {NpmRegistry} from './npm-registry.factory';
import {PluginRegistry} from './plugin-registry.factory';
import {DevfileRegistry} from './devfile-registry.factory';
import {CheDevfile} from './che-devfile.factory';
import {CheKubernetesNamespace} from './che-kubernetes-namespace.factory';

export class ApiConfig {

  constructor(register: che.IRegisterService) {
    register.factory('cheWorkspace', CheWorkspace);
    register.factory('cheFactory', CheFactory);
    register.factory('cheProfile', CheProfile);
    register.factory('chePreferences', ChePreferences);
    register.factory('cheHttpBackendProvider', CheHttpBackendProviderFactory);
    register.factory('cheHttpBackend', CheHttpBackendFactory);
    register.factory('cheAPIBuilder', CheAPIBuilder);
    register.factory('cheFactoryTemplate', CheFactoryTemplate);
    register.factory('cheService', CheService);
    register.factory('cheAPI', CheAPI);
    register.factory('cheRemote', CheRemote);
    register.factory('cheOAuthProvider', CheOAuthProvider);
    register.factory('cheSsh', CheSsh);
    register.factory('cheNamespaceRegistry', CheNamespaceRegistry);
    register.factory('cheUser', CheUser);
    register.factory('chePageObject', ChePageObject);
    register.factory('cheJsonRpcApi', CheJsonRpcApi);
    register.factory('cheKeycloak', CheKeycloak);
    register.factory('cheOrganization', CheOrganization);
    register.factory('chePermissions', ChePermissions);
    register.factory('cheResourcesDistribution', CheResourcesDistribution);
    register.factory('cheTeam', CheTeam);
    register.factory('cheTeamEventsManager', CheTeamEventsManager);
    register.factory('cheInvite', CheInvite);
    register.factory('npmRegistry', NpmRegistry);
    register.factory('pluginRegistry', PluginRegistry);
    register.factory('devfileRegistry', DevfileRegistry);
    register.factory('cheDevfile', CheDevfile);
    register.factory('cheKubernetesNamespace', CheKubernetesNamespace);
  }
}
