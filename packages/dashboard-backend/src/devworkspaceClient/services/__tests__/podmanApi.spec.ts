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
import { CoreV1Api, V1PodList, V1Secret } from '@kubernetes/client-node';

import * as helper from '@/devworkspaceClient/services/helpers/exec';
import { PodmanApiService } from '@/devworkspaceClient/services/podmanApi';

jest.mock('@/helpers/getUserName.ts');

const userNamespace = 'user-che';
const workspaceName = 'workspace-1';
const containerName = 'container-1';
const workspaceId = 'workspace-id-1';

const spyExec = jest
  .spyOn(helper, 'exec')
  .mockImplementation((..._args: Parameters<typeof helper.exec>) => {
    return Promise.resolve({
      stdOut: '',
      stdError: '',
    });
  });

describe('podman Config API Service', () => {
  let podmanApiService: PodmanApiService;

  beforeEach(() => {
    jest.resetModules();

    const { KubeConfig } = mockClient;
    const kubeConfig = new KubeConfig();

    kubeConfig.makeApiClient = jest.fn().mockImplementation(_api => {
      return {
        listNamespacedPod: () => {
          return Promise.resolve(buildListNamespacedPod());
        },
        readNamespacedSecret: () => {
          return Promise.resolve(buildSecret());
        },
      } as unknown as CoreV1Api;
    });

    podmanApiService = new PodmanApiService(kubeConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('podman login', async () => {
    await podmanApiService.podmanLogin(userNamespace, workspaceId);
    expect(spyExec).toHaveBeenCalledWith(
      workspaceName,
      userNamespace,
      containerName,
      [
        'sh',
        '-c',
        '\n' +
          '            podman login registry1 -u user1 -p password1 || true\npodman login registry2 -u user2 -p password2 || true\n' +
          '\n' +
          '            command -v oc >/dev/null 2>&1 && command -v podman >/dev/null 2>&1 && [[ -n "$HOME" ]] || { echo "oc, podman, or HOME is not set"; exit 1; }\n' +
          '            export CERTS_SRC="/var/run/secrets/kubernetes.io/serviceaccount"\n' +
          '            export CERTS_DEST="$HOME/.config/containers/certs.d/image-registry.openshift-image-registry.svc:5000"\n' +
          '            mkdir -p "$CERTS_DEST"\n' +
          '            ln -s "$CERTS_SRC/service-ca.crt" "$CERTS_DEST/service-ca.crt"\n' +
          '            ln -s "$CERTS_SRC/ca.crt" "$CERTS_DEST/ca.crt"\n' +
          '            export OC_USER=$(oc whoami)\n' +
          '            [[ "$OC_USER" == "kube:admin" ]] && export OC_USER="kubeadmin"\n' +
          '            podman login -u "$OC_USER" -p $(oc whoami -t) image-registry.openshift-image-registry.svc:5000\n' +
          '            ',
      ],
      expect.anything(),
    );
  });

  function buildSecret(): { body: V1Secret } {
    return {
      body: {
        apiVersion: 'v1',
        data: {
          '.dockerconfigjson': Buffer.from(
            '{"auths":' +
              '{' +
              '"registry1":{"username":"user1","password":"password1"},' +
              '"registry2":{"auth":"' +
              Buffer.from('user2:password2', 'binary').toString('base64') +
              '"}}' +
              '}',
            'binary',
          ).toString('base64'),
        },
        kind: 'Secret',
      },
    };
  }

  function buildListNamespacedPod(): { body: V1PodList } {
    return {
      body: {
        apiVersion: 'v1',
        items: [
          {
            metadata: {
              name: workspaceName,
              namespace: userNamespace,
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
});
