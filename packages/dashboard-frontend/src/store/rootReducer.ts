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

import { bannerAlertReducer } from '@/store/BannerAlert';
import { brandingReducer } from '@/store/Branding';
import { clusterConfigReducer } from '@/store/ClusterConfig';
import { clusterInfoReducer } from '@/store/ClusterInfo';
import { devfileRegistriesReducer } from '@/store/DevfileRegistries';
import { devWorkspacesClusterReducer } from '@/store/DevWorkspacesCluster';
import { dockerConfigReducer } from '@/store/DockerConfig';
import { eventsReducer } from '@/store/Events';
import { factoryResolverReducer } from '@/store/FactoryResolver';
import { gitConfigReducer } from '@/store/GitConfig';
import { gitOauthConfigReducer } from '@/store/GitOauthConfig';
import { infrastructureNamespacesReducer } from '@/store/InfrastructureNamespaces';
import { personalAccessTokenReducer } from '@/store/PersonalAccessTokens';
import { chePluginsReducer } from '@/store/Plugins/chePlugins';
import { devWorkspacePluginsReducer } from '@/store/Plugins/devWorkspacePlugins';
import { podsReducer } from '@/store/Pods';
import { podLogsReducer } from '@/store/Pods/Logs';
import { sanityCheckReducer } from '@/store/SanityCheck';
import { serverConfigReducer } from '@/store/ServerConfig';
import { sshKeysReducer } from '@/store/SshKeys';
import { UserIdReducer } from '@/store/User/Id';
import { UserProfileReducer } from '@/store/User/Profile';
import { workspacesReducer } from '@/store/Workspaces';
import { devWorkspacesReducer } from '@/store/Workspaces/devWorkspaces';
import { workspacePreferencesReducer } from '@/store/Workspaces/Preferences';

export const rootReducer = {
  bannerAlert: bannerAlertReducer,
  branding: brandingReducer,
  clusterConfig: clusterConfigReducer,
  clusterInfo: clusterInfoReducer,
  devfileRegistries: devfileRegistriesReducer,
  devWorkspaces: devWorkspacesReducer,
  devWorkspacesCluster: devWorkspacesClusterReducer,
  dockerConfig: dockerConfigReducer,
  dwPlugins: devWorkspacePluginsReducer,
  dwServerConfig: serverConfigReducer,
  events: eventsReducer,
  factoryResolver: factoryResolverReducer,
  gitConfig: gitConfigReducer,
  gitOauthConfig: gitOauthConfigReducer,
  infrastructureNamespaces: infrastructureNamespacesReducer,
  logs: podLogsReducer,
  personalAccessToken: personalAccessTokenReducer,
  plugins: chePluginsReducer,
  pods: podsReducer,
  sanityCheck: sanityCheckReducer,
  sshKeys: sshKeysReducer,
  userId: UserIdReducer,
  userProfile: UserProfileReducer,
  workspacePreferences: workspacePreferencesReducer,
  workspaces: workspacesReducer,
};
