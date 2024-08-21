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

/* eslint-disable @typescript-eslint/no-unused-vars */

import { api } from '@eclipse-che/common';
import * as mockClient from '@kubernetes/client-node';
import { CustomObjectsApi } from '@kubernetes/client-node';

import {
  CheClusterCustomResource,
  CustomResourceDefinitionList,
  IDevWorkspaceClusterApi,
} from '@/devworkspaceClient';
import { DevWorkspaceClusterApi } from '@/devworkspaceClient/services/devWorkspaceClusterApi';

jest.mock('@/helpers/getUserName.ts');

describe('DevWorkspace Cluster API Service', () => {
  let devWorkspaceClusterApi: IDevWorkspaceClusterApi;
  let devWorkspaceCustomResourceList: { body: api.IDevWorkspaceList };

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      CHECLUSTER_CR_NAME: 'eclipse-che',
      CHECLUSTER_CR_NAMESPACE: 'eclipse-che',
    };

    const { KubeConfig } = mockClient;
    const kubeConfig = new KubeConfig();

    kubeConfig.makeApiClient = jest.fn().mockImplementation((_api: unknown) => {
      return {
        listClusterCustomObject: (group: string) => {
          if (group === 'workspace.devfile.io') {
            return Promise.resolve(devWorkspaceCustomResourceList);
          } else if (group === 'org.eclipse.che') {
            return Promise.resolve(buildCheClusterCustomResourceList());
          }
          throw new Error('Unknown group');
        },
      } as unknown as CustomObjectsApi;
    });

    devWorkspaceClusterApi = new DevWorkspaceClusterApi(kubeConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Running workspace cluster limit exceeded', async () => {
    devWorkspaceCustomResourceList = buildDevWorkspacesCustomResourceList(2);
    const res = await devWorkspaceClusterApi.isRunningWorkspacesClusterLimitExceeded();
    expect(res).toBeTruthy();
  });

  test('Running workspace cluster limit NOT exceeded', async () => {
    devWorkspaceCustomResourceList = buildDevWorkspacesCustomResourceList(1);
    const res = await devWorkspaceClusterApi.isRunningWorkspacesClusterLimitExceeded();
    expect(res).toBeFalsy();
  });
});

function buildCheClusterCustomResourceList(): { body: CustomResourceDefinitionList } {
  return {
    body: {
      apiVersion: 'org.eclipse.che/v2',
      items: [
        {
          apiVersion: 'org.eclipse.che/v2',
          kind: 'CheCluster',
          metadata: {
            name: 'eclipse-che',
            namespace: 'eclipse-che',
          },
          spec: {
            devEnvironments: {
              maxNumberOfRunningWorkspaces: 2,
            },
          },
        } as CheClusterCustomResource,
      ],
      kind: 'CheClusterList',
    },
  };
}

function buildDevWorkspacesCustomResourceList(numOfRunningDevWorkspace: number): {
  body: api.IDevWorkspaceList;
} {
  const items = [];
  for (let i = 0; i < numOfRunningDevWorkspace; i++) {
    items.push(getRunningDevWorkspace());
  }

  return {
    body: {
      apiVersion: 'workspace.devfile.io/v1alpha2',
      items: items,
      kind: 'DevWorkspaceList',
    },
  };
}

function getRunningDevWorkspace() {
  return {
    apiVersion: 'workspace.devfile.io/v1alpha2',
    kind: 'DevWorkspace',
    status: {
      devworkspaceId: 'devworkspace-id',
      phase: 'Running',
    },
  };
}
