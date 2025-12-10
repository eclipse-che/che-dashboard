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

import { container } from '@/inversify.config';
import * as DwApi from '@/services/backend-client/devWorkspaceApi';
import {
  DEVWORKSPACE_LABEL_METADATA_NAME,
  DevWorkspaceClient,
} from '@/services/workspace-client/devworkspace/devWorkspaceClient';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';

describe('DevWorkspace client, update', () => {
  let client: DevWorkspaceClient;

  const timestampOld = '2021-09-01T00:00:01.000Z';
  const timestampNew = '2021-10-01T00:00:01.000Z';
  const dateConstructor = window.Date;

  beforeEach(() => {
    client = container.get(DevWorkspaceClient);

    class MockDate extends Date {
      constructor() {
        super(timestampNew);
      }
    }
    window.Date = MockDate as DateConstructor;
  });

  afterEach(() => {
    jest.resetAllMocks();
    window.Date = dateConstructor;
  });

  it('should add annotation of last update time', async () => {
    const testWorkspace = new DevWorkspaceBuilder()
      .withName('wksp-test')
      .withStatus({
        phase: 'RUNNING',
        mainUrl: 'link/ide',
      })
      .build();

    jest.spyOn(DwApi, 'getWorkspaceByName').mockResolvedValueOnce(testWorkspace);
    const spyPatchWorkspace = jest
      .spyOn(DwApi, 'patchWorkspace')
      .mockResolvedValueOnce({ devWorkspace: testWorkspace, headers: {} });

    await client.update(testWorkspace);

    expect(spyPatchWorkspace).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.arrayContaining([
        {
          op: 'add',
          path: '/metadata/annotations/che.eclipse.org~1last-updated-timestamp',
          value: timestampNew,
        },
      ]),
    );
  });

  it('should replace annotation of last update time', async () => {
    const testWorkspace = new DevWorkspaceBuilder()
      .withName('wksp-test')
      .withMetadata({
        annotations: {
          'che.eclipse.org/last-updated-timestamp': timestampOld,
        },
      })
      .withStatus({
        phase: 'RUNNING',
        mainUrl: 'link/ide',
      })
      .build();

    jest.spyOn(DwApi, 'getWorkspaceByName').mockResolvedValueOnce(testWorkspace);
    const spyPatchWorkspace = jest
      .spyOn(DwApi, 'patchWorkspace')
      .mockResolvedValueOnce({ devWorkspace: testWorkspace, headers: {} });

    await client.update(testWorkspace);

    expect(spyPatchWorkspace).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.arrayContaining([
        {
          op: 'replace',
          path: '/metadata/annotations/che.eclipse.org~1last-updated-timestamp',
          value: timestampNew,
        },
      ]),
    );
  });

  it('should ensure metadata annotations exist before patching', async () => {
    const testWorkspace = new DevWorkspaceBuilder()
      .withName('wksp-test')
      .withStatus({
        phase: 'RUNNING',
        mainUrl: 'link/ide',
      })
      .build();

    // Remove annotations to test the ensure logic
    delete testWorkspace.metadata.annotations;

    jest.spyOn(DwApi, 'getWorkspaceByName').mockResolvedValueOnce(testWorkspace);
    const spyPatchWorkspace = jest
      .spyOn(DwApi, 'patchWorkspace')
      .mockResolvedValueOnce({ devWorkspace: testWorkspace, headers: {} });

    await client.update(testWorkspace);

    expect(spyPatchWorkspace).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.arrayContaining([
        {
          op: 'add',
          path: '/metadata/annotations',
          value: {},
        },
      ]),
    );
  });

  it('should add custom name label when it does not exist', async () => {
    const onClusterWorkspace = new DevWorkspaceBuilder()
      .withName('wksp-test')
      .withMetadata({
        annotations: {
          'che.eclipse.org/last-updated-timestamp': timestampOld,
        },
      })
      .withStatus({
        phase: 'RUNNING',
        mainUrl: 'link/ide',
      })
      .build();

    const updatedWorkspace = new DevWorkspaceBuilder()
      .withName('wksp-test')
      .withMetadata({
        labels: {
          [DEVWORKSPACE_LABEL_METADATA_NAME]: 'my-custom-name',
        },
        annotations: {
          'che.eclipse.org/last-updated-timestamp': timestampOld,
        },
      })
      .withStatus({
        phase: 'RUNNING',
        mainUrl: 'link/ide',
      })
      .build();

    jest.spyOn(DwApi, 'getWorkspaceByName').mockResolvedValueOnce(onClusterWorkspace);
    const spyPatchWorkspace = jest
      .spyOn(DwApi, 'patchWorkspace')
      .mockResolvedValueOnce({ devWorkspace: updatedWorkspace, headers: {} });

    await client.update(updatedWorkspace);

    expect(spyPatchWorkspace).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.arrayContaining([
        {
          op: 'add',
          path: '/metadata/labels/kubernetes.io~1metadata.name',
          value: 'my-custom-name',
        },
      ]),
    );
  });

  it('should replace custom name label when it already exists', async () => {
    const onClusterWorkspace = new DevWorkspaceBuilder()
      .withName('wksp-test')
      .withMetadata({
        labels: {
          [DEVWORKSPACE_LABEL_METADATA_NAME]: 'old-name',
        },
        annotations: {
          'che.eclipse.org/last-updated-timestamp': timestampOld,
        },
      })
      .withStatus({
        phase: 'RUNNING',
        mainUrl: 'link/ide',
      })
      .build();

    const updatedWorkspace = new DevWorkspaceBuilder()
      .withName('wksp-test')
      .withMetadata({
        labels: {
          [DEVWORKSPACE_LABEL_METADATA_NAME]: 'new-name',
        },
        annotations: {
          'che.eclipse.org/last-updated-timestamp': timestampOld,
        },
      })
      .withStatus({
        phase: 'RUNNING',
        mainUrl: 'link/ide',
      })
      .build();

    jest.spyOn(DwApi, 'getWorkspaceByName').mockResolvedValueOnce(onClusterWorkspace);
    const spyPatchWorkspace = jest
      .spyOn(DwApi, 'patchWorkspace')
      .mockResolvedValueOnce({ devWorkspace: updatedWorkspace, headers: {} });

    await client.update(updatedWorkspace);

    expect(spyPatchWorkspace).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.arrayContaining([
        {
          op: 'replace',
          path: '/metadata/labels/kubernetes.io~1metadata.name',
          value: 'new-name',
        },
      ]),
    );
  });

  it('should remove custom name label when it is cleared', async () => {
    const onClusterWorkspace = new DevWorkspaceBuilder()
      .withName('wksp-test')
      .withMetadata({
        labels: {
          [DEVWORKSPACE_LABEL_METADATA_NAME]: 'custom-name',
        },
        annotations: {
          'che.eclipse.org/last-updated-timestamp': timestampOld,
        },
      })
      .withStatus({
        phase: 'RUNNING',
        mainUrl: 'link/ide',
      })
      .build();

    const updatedWorkspace = new DevWorkspaceBuilder()
      .withName('wksp-test')
      .withMetadata({
        annotations: {
          'che.eclipse.org/last-updated-timestamp': timestampOld,
        },
      })
      .withStatus({
        phase: 'RUNNING',
        mainUrl: 'link/ide',
      })
      .build();

    jest.spyOn(DwApi, 'getWorkspaceByName').mockResolvedValueOnce(onClusterWorkspace);
    const spyPatchWorkspace = jest
      .spyOn(DwApi, 'patchWorkspace')
      .mockResolvedValueOnce({ devWorkspace: updatedWorkspace, headers: {} });

    await client.update(updatedWorkspace);

    expect(spyPatchWorkspace).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.arrayContaining([
        {
          op: 'remove',
          path: '/metadata/labels/kubernetes.io~1metadata.name',
        },
      ]),
    );
  });

  it('should not patch custom name label when it has not changed', async () => {
    const onClusterWorkspace = new DevWorkspaceBuilder()
      .withName('wksp-test')
      .withMetadata({
        labels: {
          [DEVWORKSPACE_LABEL_METADATA_NAME]: 'same-name',
        },
        annotations: {
          'che.eclipse.org/last-updated-timestamp': timestampOld,
        },
      })
      .withStatus({
        phase: 'RUNNING',
        mainUrl: 'link/ide',
      })
      .build();

    const updatedWorkspace = new DevWorkspaceBuilder()
      .withName('wksp-test')
      .withMetadata({
        labels: {
          [DEVWORKSPACE_LABEL_METADATA_NAME]: 'same-name',
        },
        annotations: {
          'che.eclipse.org/last-updated-timestamp': timestampOld,
        },
      })
      .withStatus({
        phase: 'RUNNING',
        mainUrl: 'link/ide',
      })
      .build();

    jest.spyOn(DwApi, 'getWorkspaceByName').mockResolvedValueOnce(onClusterWorkspace);
    const spyPatchWorkspace = jest
      .spyOn(DwApi, 'patchWorkspace')
      .mockResolvedValueOnce({ devWorkspace: updatedWorkspace, headers: {} });

    await client.update(updatedWorkspace);

    const patchCalls = spyPatchWorkspace.mock.calls[0][2];
    const customNamePatches = patchCalls.filter(
      (p: any) => p.path === '/metadata/labels/kubernetes.io~1metadata.name',
    );

    expect(customNamePatches).toHaveLength(0);
  });
});
