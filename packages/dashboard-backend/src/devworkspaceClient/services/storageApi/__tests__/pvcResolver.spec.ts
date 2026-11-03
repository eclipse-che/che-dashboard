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
  buildDevWorkspace,
  buildPod,
  workspaceId,
} from '@/devworkspaceClient/services/storageApi/__tests__/fixtures';
import {
  COMMON_PVC_NAME,
  findProjectsContainer,
  getPodClaimName,
  getStorageStrategy,
  isDevWorkspaceRunning,
  resolveWorkspacePvc,
  toStorageStrategy,
} from '@/devworkspaceClient/services/storageApi/pvcResolver';

describe('pvcResolver', () => {
  describe('toStorageStrategy', () => {
    it.each([
      ['per-user', 'per-user'],
      ['common', 'per-user'],
      ['async', 'per-user'],
      ['per-workspace', 'per-workspace'],
      ['ephemeral', 'ephemeral'],
      ['', undefined],
      ['unknown', undefined],
      [undefined, undefined],
    ])('should map "%s" to %s', (storageType, expected) => {
      expect(toStorageStrategy(storageType)).toEqual(expected);
    });
  });

  describe('getStorageStrategy', () => {
    it('should use the DevWorkspace attribute over the server default', () => {
      const devWorkspace = buildDevWorkspace({ storageType: 'per-workspace' });
      expect(getStorageStrategy(devWorkspace, 'per-user')).toEqual('per-workspace');
    });

    it('should use the server default without attribute', () => {
      expect(getStorageStrategy(buildDevWorkspace(), 'ephemeral')).toEqual('ephemeral');
    });

    it('should fall back to per-user', () => {
      expect(getStorageStrategy(buildDevWorkspace(), '')).toEqual('per-user');
      expect(getStorageStrategy(buildDevWorkspace())).toEqual('per-user');
    });
  });

  describe('resolveWorkspacePvc', () => {
    it('per-user → claim-devworkspace, shared', () => {
      expect(
        resolveWorkspacePvc(buildDevWorkspace({ storageType: 'per-user' }), undefined),
      ).toEqual({ strategy: 'per-user', pvcName: COMMON_PVC_NAME, shared: true });
    });

    it('per-workspace → storage-<workspaceId>, not shared', () => {
      expect(
        resolveWorkspacePvc(buildDevWorkspace({ storageType: 'per-workspace' }), undefined),
      ).toEqual({ strategy: 'per-workspace', pvcName: `storage-${workspaceId}`, shared: false });
    });

    it('per-workspace without workspace id → no PVC', () => {
      expect(
        resolveWorkspacePvc(
          buildDevWorkspace({ storageType: 'per-workspace', workspaceId: null }),
          undefined,
        ),
      ).toEqual({ strategy: 'per-workspace', pvcName: undefined, shared: false });
    });

    it('ephemeral → no PVC', () => {
      expect(
        resolveWorkspacePvc(buildDevWorkspace({ storageType: 'ephemeral' }), buildPod()),
      ).toEqual({ strategy: 'ephemeral', shared: false });
    });

    it('strategy from the DevWorkspace attribute overrides the server default', () => {
      const resolution = resolveWorkspacePvc(
        buildDevWorkspace({ storageType: 'per-workspace' }),
        undefined,
        'per-user',
      );
      expect(resolution.strategy).toEqual('per-workspace');
      expect(resolution.shared).toBe(false);
    });

    it('server default is used without attribute', () => {
      const resolution = resolveWorkspacePvc(buildDevWorkspace(), undefined, 'per-workspace');
      expect(resolution.pvcName).toEqual(`storage-${workspaceId}`);
    });

    it('pod claimName takes precedence over the naming convention', () => {
      const devWorkspace = buildDevWorkspace({ storageType: 'per-user', phase: 'Running' });
      expect(resolveWorkspacePvc(devWorkspace, buildPod('custom-claim'))).toEqual({
        strategy: 'per-user',
        pvcName: 'custom-claim',
        shared: true,
      });
    });

    it('naming convention is used when the pod does not mount /projects from a PVC', () => {
      const pod = buildPod();
      pod.spec!.volumes = pod.spec!.volumes!.filter(v => v.name !== 'claim-volume');
      const devWorkspace = buildDevWorkspace({ storageType: 'per-workspace' });
      expect(resolveWorkspacePvc(devWorkspace, pod).pvcName).toEqual(`storage-${workspaceId}`);
    });
  });

  describe('pod helpers', () => {
    it('should find the container mounting /projects', () => {
      expect(findProjectsContainer(buildPod())?.name).toEqual('tools');
    });

    it('should return undefined without container mounting /projects', () => {
      expect(findProjectsContainer({ spec: { containers: [{ name: 'a' }] } })).toBeUndefined();
      expect(getPodClaimName({})).toBeUndefined();
    });

    it('should return the claim name of the /projects volume', () => {
      expect(getPodClaimName(buildPod('claim-x'))).toEqual('claim-x');
    });

    it('should detect a running workspace', () => {
      expect(isDevWorkspaceRunning(buildDevWorkspace({ phase: 'Running' }))).toBe(true);
      expect(isDevWorkspaceRunning(buildDevWorkspace({ phase: 'Stopped' }))).toBe(false);
    });
  });
});
