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

import * as mockClient from '@kubernetes/client-node';
import { CoreV1Api, V1PodList } from '@kubernetes/client-node';
import fs from 'fs';
import { parse, stringify } from 'yaml';

import * as helper from '@/devworkspaceClient/services/helpers/exec';
import { KubeConfigApiService } from '@/devworkspaceClient/services/kubeConfigApi';

// mute the output
console.error = jest.fn();

const homeUserDir = '/home/user';
const kubeConfigDir = `${homeUserDir}/.kube`;
const mockExecPrintenvHome = jest.fn().mockReturnValue({
  stdOut: homeUserDir,
  stdError: '',
});

let mockExecCatKubeConfig = jest.fn().mockReturnValue({
  stdOut: '',
  stdError: '',
});

const spyExec = jest
  .spyOn(helper, 'exec')
  .mockImplementation((...args: Parameters<typeof helper.exec>) => {
    const [, , , command] = args;
    if (command.some(c => c === 'printenv HOME')) {
      // directory where to create the kubeconfig
      return mockExecPrintenvHome();
    } else if (command.some(c => c.startsWith(`cat ${kubeConfigDir}/config`))) {
      // file empty
      return mockExecCatKubeConfig();
    } else if (command.some(c => c.startsWith('mkdir -p'))) {
      // crete the directory
      return Promise.resolve();
    } else if (
      command.some(c => c.startsWith(`echo '`) && c.endsWith(`' > ${kubeConfigDir}/config`))
    ) {
      // sync config
      return Promise.resolve();
    }
    return Promise.reject({
      stdOut: '',
      stdError: 'command executing error',
    });
  });

const namespace = 'user-che';
const workspaceName = 'workspace-1';
const containerName = 'container-1';

describe('Kubernetes Config API Service', () => {
  let kubeConfigService: KubeConfigApiService;

  beforeEach(() => {
    const { KubeConfig } = mockClient;
    const kubeConfig = new KubeConfig();

    kubeConfig.clusters = [
      {
        name: 'cluster',
        server: 'server',
        caFile: 'ca-file',
        skipTLSVerify: false,
      },
    ];
    kubeConfig.users = [
      {
        name: 'dev',
        token: 'dev-token',
      },
    ];
    kubeConfig.contexts = [
      {
        name: 'dev-context',
        user: 'dev',
        cluster: 'cluster',
      },
    ];
    kubeConfig.currentContext = 'dev-context';

    kubeConfig.makeApiClient = jest.fn().mockImplementation(_api => {
      return {
        listNamespacedPod: namespace => {
          return Promise.resolve(buildListNamespacedPod());
        },
      } as CoreV1Api;
    });
    // kubeConfig.exportConfig = jest.fn().mockReturnValue(JSON.stringify(config));
    kubeConfig.getCurrentCluster = jest.fn().mockReturnValue('');
    kubeConfig.applyToRequest = jest.fn();

    kubeConfigService = new KubeConfigApiService(kubeConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('injecting kubeconfig', async () => {
    const configContent = fs.readFileSync(__dirname + '/fixtures/kubeconfig.yaml', 'utf-8');
    await kubeConfigService.injectKubeConfig(namespace, 'wksp-id');
    expect(spyExec).toHaveBeenCalledTimes(5);

    // should attempt to resolve the KUBECONFIG env variable
    expect(spyExec).toHaveBeenNthCalledWith(
      1,
      workspaceName,
      namespace,
      containerName,
      ['sh', '-c', 'printenv KUBECONFIG'],
      expect.anything(),
    );

    // should attempt to resolve the HOME env variable
    expect(spyExec).toHaveBeenNthCalledWith(
      2,
      workspaceName,
      namespace,
      containerName,
      ['sh', '-c', 'printenv HOME'],
      expect.anything(),
    );

    // should create the directory
    expect(spyExec).toHaveBeenNthCalledWith(
      3,
      workspaceName,
      namespace,
      containerName,
      ['sh', '-c', `mkdir -p ${kubeConfigDir}`],
      expect.anything(),
    );

    // should output the kubeconfig if exist (here it does not exist)
    expect(spyExec).toHaveBeenNthCalledWith(
      4,
      workspaceName,
      namespace,
      containerName,
      ['sh', '-c', `cat ${kubeConfigDir}/config`],
      expect.anything(),
    );

    // should sync the kubeconfig to the container
    expect(spyExec).toHaveBeenNthCalledWith(
      5,
      workspaceName,
      namespace,
      containerName,
      ['sh', '-c', `echo '${configContent}' > ${kubeConfigDir}/config`],
      expect.anything(),
    );
  });

  test('should merge configs', async () => {
    const mountedConfigContent = fs.readFileSync(
      __dirname + '/fixtures/mounted_kubeconfig.yaml',
      'utf-8',
    );
    const mergedConfigContent = fs.readFileSync(
      __dirname + '/fixtures/merged_kubeconfig.yaml',
      'utf-8',
    );
    mockExecCatKubeConfig = jest.fn().mockReturnValue({
      stdOut: mountedConfigContent,
      stdError: '',
    });
    await kubeConfigService.injectKubeConfig(namespace, 'wksp-id');

    expect(spyExec).toHaveBeenNthCalledWith(
      5,
      workspaceName,
      namespace,
      containerName,
      ['sh', '-c', `echo '${mergedConfigContent}' > ${kubeConfigDir}/config`],
      expect.anything(),
    );
  });
});

function buildListNamespacedPod(): { body: V1PodList } {
  return {
    body: {
      apiVersion: 'v1',
      items: [
        {
          metadata: {
            name: workspaceName,
            namespace,
          },
          spec: {
            containers: [{ name: containerName }],
          },
        },
      ],
      kind: 'PodList',
    },
  };
}
