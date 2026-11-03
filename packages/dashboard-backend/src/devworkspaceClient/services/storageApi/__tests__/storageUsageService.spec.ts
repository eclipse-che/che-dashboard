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

import * as k8s from '@kubernetes/client-node';

import * as helper from '@/devworkspaceClient/services/helpers/exec';
import {
  buildDevWorkspace,
  buildPod,
  namespace,
} from '@/devworkspaceClient/services/storageApi/__tests__/fixtures';
import {
  parseDfOutput,
  StorageUsageService,
} from '@/devworkspaceClient/services/storageApi/storageUsageService';

const GNU_OUTPUT = `Filesystem     1024-blocks    Used Available Capacity Mounted on
/dev/rbd0         10255636 5000000   5239252      49% /projects`;

const BUSYBOX_OUTPUT = `Filesystem           1024-blocks    Used Available Capacity Mounted on
/dev/mapper/vg-lv       10475520   524288   9951232   5% /projects`;

describe('StorageUsageService', () => {
  const spyExec = jest.spyOn(helper, 'exec');
  let service: StorageUsageService;

  beforeEach(() => {
    const kc = new k8s.KubeConfig();
    kc.loadFromOptions({
      clusters: [{ name: 'cluster', server: 'https://api.cluster:6443' }],
      users: [{ name: 'user', token: 'user-token' }],
      contexts: [{ name: 'ctx', cluster: 'cluster', user: 'user' }],
      currentContext: 'ctx',
    });
    service = new StorageUsageService(kc);
    spyExec.mockResolvedValue({ stdOut: GNU_OUTPUT, stdError: '' });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('parseDfOutput', () => {
    it('should parse GNU coreutils output', () => {
      expect(parseDfOutput(GNU_OUTPUT)).toEqual({
        totalBytes: 10255636 * 1024,
        usedBytes: 5000000 * 1024,
        availableBytes: 5239252 * 1024,
      });
    });

    it('should parse BusyBox output', () => {
      expect(parseDfOutput(BUSYBOX_OUTPUT)).toEqual({
        totalBytes: 10475520 * 1024,
        usedBytes: 524288 * 1024,
        availableBytes: 9951232 * 1024,
      });
    });

    it('should parse output with the header and data lines joined', () => {
      // the exec helper trims and concatenates the websocket frames
      expect(parseDfOutput(GNU_OUTPUT.replace('\n', ''))).toEqual(parseDfOutput(GNU_OUTPUT));
    });

    it.each([[''], ['df: /projects: No such file or directory'], ['Filesystem 1024-blocks']])(
      'should throw on unparseable output "%s"',
      output => {
        expect(() => parseDfOutput(output)).toThrow('Unable to parse the disk usage output');
      },
    );
  });

  describe('getUsage', () => {
    it('should exec df in the container mounting /projects with the user token', async () => {
      const usage = await service.getUsage(buildDevWorkspace({ phase: 'Running' }), buildPod());

      expect(spyExec).toHaveBeenCalledWith(
        buildPod().metadata!.name,
        namespace,
        'tools',
        ['df', '-Pk', '/projects'],
        expect.objectContaining({
          server: 'https://api.cluster:6443',
          opts: expect.objectContaining({
            headers: expect.objectContaining({ Authorization: 'Bearer user-token' }),
          }),
        }),
      );
      expect(usage.usedBytes).toEqual(5000000 * 1024);
    });

    it('should return 409 if the workspace is stopped', async () => {
      await expect(
        service.getUsage(buildDevWorkspace({ phase: 'Stopped' }), buildPod()),
      ).rejects.toMatchObject({ statusCode: 409 });
      expect(spyExec).not.toHaveBeenCalled();
    });

    it('should return 409 without pod', async () => {
      await expect(
        service.getUsage(buildDevWorkspace({ phase: 'Running' }), undefined),
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('should return 409 if no container mounts /projects', async () => {
      const pod = buildPod();
      pod.spec!.containers = [pod.spec!.containers[0]];

      await expect(
        service.getUsage(buildDevWorkspace({ phase: 'Running' }), pod),
      ).rejects.toMatchObject({ statusCode: 409, message: 'No container mounts /projects' });
    });

    it('should return 500 on unparseable output', async () => {
      spyExec.mockResolvedValue({ stdOut: '', stdError: 'df: not found' });

      await expect(
        service.getUsage(buildDevWorkspace({ phase: 'Running' }), buildPod()),
      ).rejects.toMatchObject({
        statusCode: 500,
        message: expect.stringMatching(/Unable to parse the disk usage output.*df: not found/),
      });
    });

    it('should return 500 on unparseable output without stderr', async () => {
      spyExec.mockResolvedValue({ stdOut: '', stdError: '' });

      await expect(
        service.getUsage(buildDevWorkspace({ phase: 'Running' }), buildPod()),
      ).rejects.toMatchObject({
        statusCode: 500,
        message: 'Unable to parse the disk usage output: ""',
      });
    });

    it('should fall back to the DevWorkspace namespace', async () => {
      const pod = buildPod();
      delete pod.metadata!.namespace;
      await service.getUsage(buildDevWorkspace({ phase: 'Running' }), pod);

      const devWorkspace = buildDevWorkspace({ phase: 'Running' });
      delete devWorkspace.metadata!.namespace;
      await service.getUsage(devWorkspace, pod);

      expect(spyExec.mock.calls.map(call => call[1])).toEqual([namespace, '']);
    });

    it('should return 500 if exec fails', async () => {
      spyExec.mockRejectedValue('exec timed out after 30 seconds');

      await expect(
        service.getUsage(buildDevWorkspace({ phase: 'Running' }), buildPod()),
      ).rejects.toMatchObject({
        statusCode: 500,
        message: 'Unable to read the disk usage: exec timed out after 30 seconds',
      });
    });
  });
});
