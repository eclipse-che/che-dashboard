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

import { Sandbox, SandboxPatch, SandboxPodSpec, SandboxVolume } from '@/services/types';

/**
 * Where the sandbox keeps what it is working on.
 *
 * The Sandbox API has a storage field of its own, `spec.volumeClaimTemplates`,
 * and the dashboard deliberately does not use it: the CRD marks it immutable,
 * so a sandbox created without it could never be given storage afterwards. A
 * claim the dashboard provisions is referenced from `spec.podTemplate`, which
 * carries no such rule, and that is what makes the switch below possible at
 * all.
 */
export type SandboxStorageType = 'per-sandbox' | 'ephemeral';

/** Offered in the order the workspace storage dialog offers its own. */
export const STORAGE_TYPES: SandboxStorageType[] = ['per-sandbox', 'ephemeral'];

/**
 * What a sandbox gets when nothing says otherwise.
 *
 * An agent that loses its work every time the sandbox is suspended is of
 * little use, so the useful case is the default and the cheap one is opt-in.
 */
export const DEFAULT_STORAGE_TYPE: SandboxStorageType = 'per-sandbox';

export const STORAGE_TYPE_TITLES: Record<SandboxStorageType, string> = {
  'per-sandbox': 'Per-sandbox',
  ephemeral: 'Ephemeral',
};

/** One line each, for the radios and the create form's helper text. */
export const STORAGE_TYPE_DESCRIPTIONS: Record<SandboxStorageType, string> = {
  'per-sandbox':
    'Per-sandbox Storage. A persistent volume claim is provisioned for this sandbox and kept across suspends.',
  ephemeral:
    'Ephemeral Storage allows for faster I/O but may have limited storage and is not persistent.',
};

/** Name of the volume in the pod template, for both storage types. */
export const STORAGE_VOLUME_NAME = 'sandbox-storage';

/**
 * Where the volume is mounted.
 *
 * Not the home directory: mounting over `$HOME` hides whatever the image put
 * there, and an image that expects its own dotfiles then starts differently
 * depending on the storage type.
 */
export const STORAGE_MOUNT_PATH = '/workspace';

/** Size of the claim the backend provisions. */
export const DEFAULT_STORAGE_SIZE = '5Gi';

/** Size cap of the `emptyDir` the ephemeral type uses. */
export const EPHEMERAL_SIZE_LIMIT = '5Gi';

/**
 * Name of the claim that backs one sandbox.
 *
 * Derived rather than recorded so the backend can find the claim of a sandbox
 * it is deleting without reading the manifest first. A Sandbox name is a
 * DNS-1123 label, at most 63 characters, so the prefix cannot push the result
 * past the 253 a claim name allows.
 */
export function buildClaimName(sandboxName: string): string {
  return `sandbox-${sandboxName}`;
}

function findStorageVolume(podSpec: SandboxPodSpec | undefined): SandboxVolume | undefined {
  return podSpec?.volumes?.find(volume => volume.name === STORAGE_VOLUME_NAME);
}

/**
 * What the sandbox has now, read off the object rather than an annotation.
 *
 * A sandbox that declares no volume of ours - one created from a sample, say -
 * reports `ephemeral`, which is what it behaves like.
 */
export function getSandboxStorageType(sandbox: Sandbox): SandboxStorageType {
  const volume = findStorageVolume(sandbox.spec?.podTemplate?.spec);
  return volume?.persistentVolumeClaim !== undefined ? 'per-sandbox' : 'ephemeral';
}

/** The claim a sandbox uses, or nothing when it stores nothing. */
export function getSandboxClaimName(sandbox: Sandbox): string | undefined {
  return findStorageVolume(sandbox.spec?.podTemplate?.spec)?.persistentVolumeClaim?.claimName;
}

function buildVolume(sandboxName: string, storageType: SandboxStorageType): SandboxVolume {
  if (storageType === 'per-sandbox') {
    return {
      name: STORAGE_VOLUME_NAME,
      persistentVolumeClaim: { claimName: buildClaimName(sandboxName) },
    };
  }
  return {
    name: STORAGE_VOLUME_NAME,
    emptyDir: { sizeLimit: EPHEMERAL_SIZE_LIMIT },
  };
}

/**
 * Puts the chosen storage on the pod template.
 *
 * Only the sandbox's own volume is touched; whatever else the manifest carries
 * is left where it is, because a sample is free to mount its own things and
 * choosing a storage type is no reason to drop them.
 *
 * The mount goes on the first container, which is the one the wizard names
 * `agent` and the one the terminal attaches to. Init containers are left out:
 * they exist to copy the agent CLIs in and are gone before the volume matters.
 *
 * The argument is left untouched.
 */
export function applyStorage(sandbox: Sandbox, storageType: SandboxStorageType): Sandbox {
  const podSpec = sandbox.spec.podTemplate.spec;
  const [target, ...otherContainers] = podSpec.containers;

  const volumes = [
    ...(podSpec.volumes ?? []).filter(volume => volume.name !== STORAGE_VOLUME_NAME),
    buildVolume(sandbox.metadata.name, storageType),
  ];

  const containers =
    target === undefined
      ? podSpec.containers
      : [
          {
            ...target,
            volumeMounts: [
              ...(target.volumeMounts ?? []).filter(mount => mount.name !== STORAGE_VOLUME_NAME),
              { name: STORAGE_VOLUME_NAME, mountPath: STORAGE_MOUNT_PATH },
            ],
          },
          ...otherContainers,
        ];

  return {
    ...sandbox,
    spec: {
      ...sandbox.spec,
      podTemplate: {
        ...sandbox.spec.podTemplate,
        spec: { ...podSpec, containers, volumes },
      },
    },
  };
}

/**
 * Merge patch that moves an existing sandbox to another storage type.
 *
 * `spec.podTemplate` goes whole, for the same reason the AI tools patch sends
 * it whole: a merge patch cannot take an entry out of a list, and switching
 * storage replaces one entry of `volumes` with another.
 *
 * `spec.volumeClaimTemplates` is never mentioned. It is the one field the CRD
 * refuses to see change, and a merge patch that repeated its current value
 * would still have to get it byte for byte right.
 */
export function buildStoragePatch(sandbox: Sandbox, storageType: SandboxStorageType): SandboxPatch {
  const desired = applyStorage(sandbox, storageType);
  return { spec: { podTemplate: desired.spec.podTemplate } };
}
