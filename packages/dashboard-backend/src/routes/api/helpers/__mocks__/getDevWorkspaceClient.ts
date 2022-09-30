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

/* eslint-disable @typescript-eslint/no-unused-vars */

import { V1alpha2DevWorkspace, V1alpha2DevWorkspaceTemplate } from '@devfile/api';
import {
  DevWorkspaceClient,
  IDevWorkspaceApi,
  IDevWorkspaceList,
  IDevWorkspaceTemplateApi,
  IDockerConfigApi,
  IKubeConfigApi,
  IServerConfigApi,
} from '../../../../devworkspace-client';
import { getDevWorkspaceClient as helper } from '../getDevWorkspaceClient';

export const stubDashboardWarning = 'Dashboard warning';
export const stubRunningWorkspacesLimit = 2;

export const stubDevWorkspacesList: IDevWorkspaceList = {
  apiVersion: 'workspace.devfile.io/v1alpha2',
  kind: 'DevWorkspaceList',
  metadata: {
    resourceVersion: '123456789',
  },
  items: [],
};
export const stubDevWorkspace: V1alpha2DevWorkspace = {
  apiVersion: 'workspace.devfile.io/v1alpha2',
  kind: 'DevWorkspace',
};

export const stubDevWorkspaceTemplatesList = [
  {
    apiVersion: 'workspace.devfile.io/v1alpha2',
    kind: 'DevWorkspaceTemplate',
  },
];
export const stubDevWorkspaceTemplate: V1alpha2DevWorkspaceTemplate = {
  apiVersion: 'workspace.devfile.io/v1alpha2',
  kind: 'DevWorkspaceTemplate',
};

export const stubDockerConfig = {};

export function getDevWorkspaceClient(args: Parameters<typeof helper>): ReturnType<typeof helper> {
  return {
    serverConfigApi: {
      getCheCustomResource: () => ({}),
      getDashboardWarning: _cheCustomResource => stubDashboardWarning,
      getRunningWorkspacesLimit: _cheCustomResource => stubRunningWorkspacesLimit,
    } as IServerConfigApi,
    devworkspaceApi: {
      create: (_devworkspace, _namespace) => Promise.resolve(stubDevWorkspace),
      delete: (_namespace, _name) => Promise.resolve(undefined),
      getByName: (_namespace, _name) => Promise.resolve(stubDevWorkspace),
      listInNamespace: _namespace => Promise.resolve(stubDevWorkspacesList),
      patch: (_namespace, _name, _patches) => Promise.resolve(stubDevWorkspace),
    } as IDevWorkspaceApi,
    dockerConfigApi: {
      read: _namespace => Promise.resolve(stubDockerConfig),
      update: (_namespace, _dockerCfg) => Promise.resolve(stubDockerConfig),
    } as IDockerConfigApi,
    kubeConfigApi: {
      injectKubeConfig: (_namespace, _devworkspaceId) => Promise.resolve(undefined),
    } as IKubeConfigApi,
    templateApi: {
      create: _template => Promise.resolve(stubDevWorkspaceTemplate),
      listInNamespace: _namespace => Promise.resolve(stubDevWorkspaceTemplatesList),
      patch: (_namespace, _name, _patches) => Promise.resolve(stubDevWorkspaceTemplate),
    } as IDevWorkspaceTemplateApi,
  } as DevWorkspaceClient;
}
