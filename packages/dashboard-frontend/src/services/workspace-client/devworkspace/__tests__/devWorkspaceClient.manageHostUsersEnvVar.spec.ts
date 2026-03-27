/*
 * Copyright (c) 2018-2026 Red Hat, Inc.
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

import { container } from '@/inversify.config';
import * as DwApi from '@/services/backend-client/devWorkspaceApi';
import devfileApi from '@/services/devfileApi';
import { DevWorkspaceClient } from '@/services/workspace-client/devworkspace/devWorkspaceClient';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';

describe('DevWorkspace client, manageHostUsersEnvVar', () => {
  const name = 'wksp-test';
  const namespace = 'user-che';
  let client: DevWorkspaceClient;
  let devWorkspaceBuilder: DevWorkspaceBuilder;
  let spyPatchWorkspace: jest.SpyInstance;

  beforeEach(() => {
    client = container.get(DevWorkspaceClient);
    devWorkspaceBuilder = new DevWorkspaceBuilder().withMetadata({ name, namespace });

    spyPatchWorkspace = jest
      .spyOn(DwApi, 'patchWorkspace')
      .mockResolvedValue({ devWorkspace: {} as devfileApi.DevWorkspace, headers: {} });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('setHostUsersEnvVar', () => {
    it('should return patch to add env when component has no container.env', () => {
      const devWorkspace = devWorkspaceBuilder
        .withSpec({
          template: {
            components: [
              { name: 'cmp1', container: { image: 'img1' } },
              { name: 'cmp2', container: { image: 'img2' } },
            ],
          },
        })
        .build();

      const patch = client.setHostUsersEnvVar(devWorkspace, false);

      expect(patch).toHaveLength(2);
      expect(patch[0]).toEqual({
        op: 'add',
        path: '/spec/template/components/0/container/env',
        value: [{ name: 'HOST_USERS', value: 'false' }],
      });
      expect(patch[1]).toEqual({
        op: 'add',
        path: '/spec/template/components/1/container/env',
        value: [{ name: 'HOST_USERS', value: 'false' }],
      });
    });

    it('should return patch to add HOST_USERS when container.env exists but has no HOST_USERS', () => {
      const devWorkspace = devWorkspaceBuilder
        .withSpec({
          template: {
            components: [
              {
                name: 'cmp1',
                container: {
                  image: 'img1',
                  env: [{ name: 'OTHER', value: 'x' }],
                },
              },
            ],
          },
        })
        .build();

      const patch = client.setHostUsersEnvVar(devWorkspace, true);

      expect(patch).toHaveLength(1);
      expect(patch[0]).toEqual({
        op: 'add',
        path: '/spec/template/components/0/container/env/-',
        value: { name: 'HOST_USERS', value: 'true' },
      });
    });

    it('should return patch to replace when HOST_USERS exists with different value', () => {
      const devWorkspace = devWorkspaceBuilder
        .withSpec({
          template: {
            components: [
              {
                name: 'cmp1',
                container: {
                  image: 'img1',
                  env: [{ name: 'HOST_USERS', value: 'true' }],
                },
              },
            ],
          },
        })
        .build();

      const patch = client.setHostUsersEnvVar(devWorkspace, false);

      expect(patch).toHaveLength(1);
      expect(patch[0]).toEqual({
        op: 'replace',
        path: '/spec/template/components/0/container/env/0',
        value: { name: 'HOST_USERS', value: 'false' },
      });
    });

    it('should return empty patch when HOST_USERS already has target value', () => {
      const devWorkspace = devWorkspaceBuilder
        .withSpec({
          template: {
            components: [
              {
                name: 'cmp1',
                container: {
                  image: 'img1',
                  env: [{ name: 'HOST_USERS', value: 'false' }],
                },
              },
            ],
          },
        })
        .build();

      const patch = client.setHostUsersEnvVar(devWorkspace, false);

      expect(patch).toHaveLength(0);
    });

    it('should skip components without container', () => {
      const devWorkspace = devWorkspaceBuilder
        .withSpec({
          template: {
            components: [{ name: 'cmp1' }, { name: 'cmp2', container: { image: 'img2' } }],
          },
        })
        .build();

      const patch = client.setHostUsersEnvVar(devWorkspace, false);

      expect(patch).toHaveLength(1);
      expect(patch[0].path).toContain('/spec/template/components/1/');
    });

    it('should return empty patch when template has no components', () => {
      const devWorkspace = devWorkspaceBuilder.withSpec({ template: {} }).build();

      const patch = client.setHostUsersEnvVar(devWorkspace, false);

      expect(patch).toHaveLength(0);
    });
  });

  describe('removeHostUsersEnvVar', () => {
    it('should return patch to remove HOST_USERS when present', () => {
      const devWorkspace = devWorkspaceBuilder
        .withSpec({
          template: {
            components: [
              {
                name: 'cmp1',
                container: {
                  image: 'img1',
                  env: [
                    { name: 'OTHER', value: 'x' },
                    { name: 'HOST_USERS', value: 'true' },
                  ],
                },
              },
            ],
          },
        })
        .build();

      const patch = client.removeHostUsersEnvVar(devWorkspace);

      expect(patch).toHaveLength(1);
      expect(patch[0]).toEqual({
        op: 'remove',
        path: '/spec/template/components/0/container/env/1',
      });
    });

    it('should return empty patch when no component has HOST_USERS', () => {
      const devWorkspace = devWorkspaceBuilder
        .withSpec({
          template: {
            components: [
              {
                name: 'cmp1',
                container: {
                  image: 'img1',
                  env: [{ name: 'OTHER', value: 'x' }],
                },
              },
            ],
          },
        })
        .build();

      const patch = client.removeHostUsersEnvVar(devWorkspace);

      expect(patch).toHaveLength(0);
    });

    it('should skip components without container or env', () => {
      const devWorkspace = devWorkspaceBuilder
        .withSpec({
          template: {
            components: [
              { name: 'cmp1' },
              { name: 'cmp2', container: { image: 'img2' } },
              {
                name: 'cmp3',
                container: {
                  image: 'img3',
                  env: [{ name: 'HOST_USERS', value: 'true' }],
                },
              },
            ],
          },
        })
        .build();

      const patch = client.removeHostUsersEnvVar(devWorkspace);

      expect(patch).toHaveLength(1);
      expect(patch[0].path).toContain('/spec/template/components/2/');
    });
  });

  describe('manageContainerSccAttribute', () => {
    it('should set HOST_USERS to false when container run is enabled', async () => {
      const devWorkspace = devWorkspaceBuilder
        .withSpec({
          template: {
            components: [{ name: 'cmp1', container: { image: 'img1' } }],
          },
        })
        .build();
      const config = {
        containerRun: {
          disableContainerRunCapabilities: false,
          containerRunConfiguration: {
            openShiftSecurityContextConstraint: 'container-run',
          },
        },
        containerBuild: { disableContainerBuildCapabilities: true },
      } as api.IServerConfig;

      await client.manageContainerSccAttribute(devWorkspace, config);

      expect(spyPatchWorkspace).toHaveBeenCalled();
      const patches = spyPatchWorkspace.mock.calls[0][2];
      expect(patches.some((p: { path: string }) => p.path.includes('env'))).toBe(true);
      const hasHostUsersFalse = (p: { value?: unknown }) =>
        Array.isArray(p.value)
          ? (p.value as { value: string }[]).some(v => v.value === 'false')
          : (p.value as { value?: string })?.value === 'false';
      expect(patches.some(hasHostUsersFalse)).toBe(true);
    });

    it('should set HOST_USERS to true when container run disabled but container build enabled', async () => {
      const devWorkspace = devWorkspaceBuilder
        .withSpec({
          template: {
            components: [{ name: 'cmp1', container: { image: 'img1' } }],
          },
        })
        .build();
      const config = {
        containerRun: { disableContainerRunCapabilities: true },
        containerBuild: {
          disableContainerBuildCapabilities: false,
          containerBuildConfiguration: {
            openShiftSecurityContextConstraint: 'container-build',
          },
        },
      } as api.IServerConfig;

      await client.manageContainerSccAttribute(devWorkspace, config);

      expect(spyPatchWorkspace).toHaveBeenCalled();
      const patches = spyPatchWorkspace.mock.calls[0][2];
      expect(patches.some((p: { path: string }) => p.path.includes('env'))).toBe(true);
      const hasHostUsersTrue = (p: { value?: unknown }) =>
        Array.isArray(p.value)
          ? (p.value as { value: string }[]).some(v => v.value === 'true')
          : (p.value as { value?: string })?.value === 'true';
      expect(patches.some(hasHostUsersTrue)).toBe(true);
    });

    it('should remove HOST_USERS when both container run and container build disabled', async () => {
      const devWorkspace = devWorkspaceBuilder
        .withSpec({
          template: {
            components: [
              {
                name: 'cmp1',
                container: {
                  image: 'img1',
                  env: [{ name: 'HOST_USERS', value: 'true' }],
                },
              },
            ],
          },
        })
        .build();
      const config = {
        containerRun: { disableContainerRunCapabilities: true },
        containerBuild: { disableContainerBuildCapabilities: true },
      } as api.IServerConfig;

      await client.manageContainerSccAttribute(devWorkspace, config);

      expect(spyPatchWorkspace).toHaveBeenCalledWith(namespace, name, [
        expect.objectContaining({
          op: 'remove',
          path: expect.stringContaining('env'),
        }),
      ]);
    });

    it('should not call patchWorkspace when patch is empty', async () => {
      const devWorkspace = devWorkspaceBuilder
        .withSpec({
          template: {
            attributes: {
              'controller.devfile.io/scc': 'container-run',
            },
            components: [
              {
                name: 'cmp1',
                container: {
                  image: 'img1',
                  env: [{ name: 'HOST_USERS', value: 'false' }],
                },
              },
            ],
          },
        })
        .build();
      const config = {
        containerRun: {
          disableContainerRunCapabilities: false,
          containerRunConfiguration: {
            openShiftSecurityContextConstraint: 'container-run',
          },
        },
      } as api.IServerConfig;

      const result = await client.manageContainerSccAttribute(devWorkspace, config);

      expect(spyPatchWorkspace).not.toHaveBeenCalled();
      expect(result).toBe(devWorkspace);
    });
  });
});
