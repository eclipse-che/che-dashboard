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

import {
  applyStorage,
  buildClaimName,
  buildStoragePatch,
  DEFAULT_STORAGE_TYPE,
  EPHEMERAL_SIZE_LIMIT,
  getSandboxClaimName,
  getSandboxStorageType,
  STORAGE_MOUNT_PATH,
  STORAGE_VOLUME_NAME,
} from '@/services/sandboxStorage';
import { Sandbox, SandboxPodSpec } from '@/services/types';

function sandbox(podSpec: Partial<SandboxPodSpec> = {}): Sandbox {
  return {
    apiVersion: 'agents.x-k8s.io/v1beta1',
    kind: 'Sandbox',
    metadata: { name: 'my-agent', namespace: 'user-ns' },
    spec: {
      podTemplate: {
        spec: {
          containers: [{ name: 'agent', image: 'ubi9' }],
          ...podSpec,
        },
      },
    },
  };
}

describe('buildClaimName', () => {
  it('names the claim after the sandbox', () => {
    expect(buildClaimName('my-agent')).toBe('sandbox-my-agent');
  });
});

describe('getSandboxStorageType', () => {
  it('reads per-sandbox off a claim reference', () => {
    const withClaim = applyStorage(sandbox(), 'per-sandbox');

    expect(getSandboxStorageType(withClaim)).toBe('per-sandbox');
    expect(getSandboxClaimName(withClaim)).toBe('sandbox-my-agent');
  });

  it('reads ephemeral off an emptyDir', () => {
    const withEmptyDir = applyStorage(sandbox(), 'ephemeral');

    expect(getSandboxStorageType(withEmptyDir)).toBe('ephemeral');
    expect(getSandboxClaimName(withEmptyDir)).toBeUndefined();
  });

  it('calls a sandbox that declares no volume of ours ephemeral', () => {
    expect(getSandboxStorageType(sandbox())).toBe('ephemeral');
    expect(getSandboxClaimName(sandbox())).toBeUndefined();
  });

  it('ignores a volume of some other name', () => {
    const sample = sandbox({
      volumes: [{ name: 'cache', persistentVolumeClaim: { claimName: 'my-own-claim' } }],
    });

    expect(getSandboxStorageType(sample)).toBe('ephemeral');
  });
});

describe('applyStorage', () => {
  it('claims storage and mounts it on the first container', () => {
    const result = applyStorage(sandbox(), 'per-sandbox');
    const { spec } = result.spec.podTemplate;

    expect(spec.volumes).toEqual([
      { name: STORAGE_VOLUME_NAME, persistentVolumeClaim: { claimName: 'sandbox-my-agent' } },
    ]);
    expect(spec.containers[0].volumeMounts).toEqual([
      { name: STORAGE_VOLUME_NAME, mountPath: STORAGE_MOUNT_PATH },
    ]);
  });

  it('caps the emptyDir the ephemeral type uses', () => {
    const { spec } = applyStorage(sandbox(), 'ephemeral').spec.podTemplate;

    expect(spec.volumes).toEqual([
      { name: STORAGE_VOLUME_NAME, emptyDir: { sizeLimit: EPHEMERAL_SIZE_LIMIT } },
    ]);
  });

  it('keeps whatever else the manifest mounts', () => {
    const sample = sandbox({
      volumes: [{ name: 'injected-tools', emptyDir: {} }],
      containers: [
        {
          name: 'agent',
          image: 'ubi9',
          volumeMounts: [{ name: 'injected-tools', mountPath: '/injected-tools' }],
        },
      ],
    });

    const { spec } = applyStorage(sample, 'per-sandbox').spec.podTemplate;

    expect(spec.volumes?.map(volume => volume.name)).toEqual([
      'injected-tools',
      STORAGE_VOLUME_NAME,
    ]);
    expect(spec.containers[0].volumeMounts?.map(mount => mount.name)).toEqual([
      'injected-tools',
      STORAGE_VOLUME_NAME,
    ]);
  });

  it('replaces the volume rather than adding a second one when switching', () => {
    const switched = applyStorage(applyStorage(sandbox(), 'per-sandbox'), 'ephemeral');
    const { spec } = switched.spec.podTemplate;

    expect(spec.volumes).toHaveLength(1);
    expect(spec.containers[0].volumeMounts).toHaveLength(1);
    expect(getSandboxStorageType(switched)).toBe('ephemeral');
  });

  it('leaves containers beyond the first alone', () => {
    const sample = sandbox({
      containers: [
        { name: 'agent', image: 'ubi9' },
        { name: 'sidecar', image: 'busybox' },
      ],
    });

    const { spec } = applyStorage(sample, 'per-sandbox').spec.podTemplate;

    expect(spec.containers[1].volumeMounts).toBeUndefined();
  });

  it('declares the volume even when there is no container to mount it on', () => {
    const { spec } = applyStorage(sandbox({ containers: [] }), 'per-sandbox').spec.podTemplate;

    expect(spec.containers).toEqual([]);
    expect(spec.volumes).toHaveLength(1);
  });

  it('leaves the argument untouched', () => {
    const original = sandbox();

    applyStorage(original, 'per-sandbox');

    expect(original.spec.podTemplate.spec.volumes).toBeUndefined();
  });
});

describe('buildStoragePatch', () => {
  it('sends the pod template whole and says nothing about volumeClaimTemplates', () => {
    const patch = buildStoragePatch(applyStorage(sandbox(), 'per-sandbox'), 'ephemeral');

    expect(Object.keys(patch.spec ?? {})).toEqual(['podTemplate']);
    expect(patch.spec?.podTemplate?.spec.volumes).toEqual([
      { name: STORAGE_VOLUME_NAME, emptyDir: { sizeLimit: EPHEMERAL_SIZE_LIMIT } },
    ]);
  });
});

describe('DEFAULT_STORAGE_TYPE', () => {
  it('keeps the work of a suspended sandbox', () => {
    expect(DEFAULT_STORAGE_TYPE).toBe('per-sandbox');
  });
});
