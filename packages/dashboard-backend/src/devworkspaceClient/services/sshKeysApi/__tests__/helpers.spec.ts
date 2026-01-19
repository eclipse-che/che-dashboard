/*
 * Copyright (c) 2018-2025 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { api } from '@eclipse-che/common';
import k8s from '@kubernetes/client-node';

import {
  buildLabelSelector,
  fromSecret,
  isSshKeySecret,
  SSH_ANNOTATIONS,
  SSH_CONFIG,
  SSH_CONFIG_LABELS,
  SSH_SECRET_LABELS,
  SshConfigConfigmap,
  SshKeySecret,
  toSecret,
  toSshConfigConfigmap,
} from '@/devworkspaceClient/services/sshKeysApi/helpers';

describe('Helpers for SSH Keys API', () => {
  test('buildLabelSelector', () => {
    expect(buildLabelSelector()).toEqual(
      'controller.devfile.io/mount-to-devworkspace=true,controller.devfile.io/watch-secret=true',
    );
  });

  describe('isShhKeySecret', () => {
    let secret: SshKeySecret;

    test('correct secret', () => {
      secret = {
        metadata: {
          annotations: SSH_ANNOTATIONS,
          labels: SSH_SECRET_LABELS,
          name: 'git-ssh-key',
        },
        data: {} as SshKeySecret['data'],
      } as SshKeySecret;

      expect(isSshKeySecret(secret)).toBeTruthy();
    });

    test('incorrect secret', () => {
      secret = {
        metadata: {
          annotations: SSH_ANNOTATIONS,
          labels: SSH_SECRET_LABELS,
          name: 'my-key-asdf-1234' as unknown,
        },
        data: {} as SshKeySecret['data'],
      } as SshKeySecret;

      expect(isSshKeySecret(secret)).toBeFalsy();
    });
  });

  describe('fromSecret', () => {
    test('SSH key secret', () => {
      const secret: SshKeySecret = {
        metadata: {
          annotations: SSH_ANNOTATIONS,
          labels: SSH_SECRET_LABELS,
          name: 'git-ssh-key',
          resourceVersion: '1',
        },
        data: {
          'dwo_ssh_key.pub': btoa('ssh-key-pub-data'),
          dwo_ssh_key: btoa('ssh-key-data'),
          passphrase: '',
        },
      };

      const sshKey = fromSecret(secret);

      expect(sshKey).toStrictEqual({
        creationTimestamp: undefined,
        name: 'git-ssh-key',
        keyPub: btoa('ssh-key-pub-data'),
      });
    });

    test('not SSH key secret', () => {
      const secret: k8s.V1Secret = {
        kind: 'Secret',
        metadata: {
          name: 'some-secret',
        },
      };

      expect(() => fromSecret(secret)).toThrow();
    });
  });

  describe('toSecret', () => {
    test('SSH key with correct data', () => {
      const namespace = 'user-che';
      const token: api.NewSshKey = {
        name: 'git-ssh-key',
        key: 'ssh-key-data',
        keyPub: 'ssh-key-pub-data',
      };

      const secret = toSecret(namespace, token);
      expect(secret).toStrictEqual({
        apiVersion: 'v1',
        data: {
          'dwo_ssh_key.pub': token.keyPub,
          dwo_ssh_key: token.key,
        },
        kind: 'Secret',
        metadata: {
          annotations: SSH_ANNOTATIONS,
          labels: SSH_SECRET_LABELS,
          name: 'git-ssh-key',
          namespace: 'user-che',
        },
      } as SshKeySecret);
    });
  });

  describe('toConfig', () => {
    test('SSH Config', () => {
      const namespace = 'user-che';

      const sshConfigConfigmap = toSshConfigConfigmap(namespace);
      expect(sshConfigConfigmap).toStrictEqual({
        apiVersion: 'v1',
        data: {
          ssh_config: SSH_CONFIG,
        },
        kind: 'ConfigMap',
        metadata: {
          annotations: SSH_ANNOTATIONS,
          labels: SSH_CONFIG_LABELS,
          name: 'git-ssh-config',
          namespace: 'user-che',
        },
      } as SshConfigConfigmap);
    });
  });
  test('SSH key with passphrase', () => {
    const namespace = 'user-che';
    const token: api.NewSshKey = {
      name: 'git-ssh-key',
      key: 'ssh-key-data',
      keyPub: 'ssh-key-pub-data',
      passphrase: 'passphrase',
    };

    const secret = toSecret(namespace, token);
    expect(secret).toStrictEqual({
      apiVersion: 'v1',
      data: {
        'dwo_ssh_key.pub': token.keyPub,
        dwo_ssh_key: token.key,
        passphrase: btoa('passphrase'),
      },
      kind: 'Secret',
      metadata: {
        annotations: SSH_ANNOTATIONS,
        labels: SSH_SECRET_LABELS,
        name: 'git-ssh-key',
        namespace: 'user-che',
      },
    } as SshKeySecret);
  });
});
