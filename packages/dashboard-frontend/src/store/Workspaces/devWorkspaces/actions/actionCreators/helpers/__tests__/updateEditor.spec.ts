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

import { ApplicationId } from '@eclipse-che/common';

import { container } from '@/inversify.config';
import * as DwtApi from '@/services/backend-client/devWorkspaceTemplateApi';
import devfileApi from '@/services/devfileApi';
import { che } from '@/services/models';
import { DevWorkspaceClient } from '@/services/workspace-client/devworkspace/devWorkspaceClient';
import { RootState } from '@/store';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import * as clusterInfo from '@/store/ClusterInfo';
import * as infrastructureNamespace from '@/store/InfrastructureNamespaces';
import { selectDwEditorsPluginsList } from '@/store/Plugins/devWorkspacePlugins';
import * as serverConfig from '@/store/ServerConfig';
import {
  getEditorName,
  getLifeTimeMs,
  updateEditor,
} from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers/updateEditor';

jest.mock('@eclipse-che/common');
jest.mock('@/inversify.config');
jest.mock('@/services/backend-client/devWorkspaceTemplateApi');
jest.mock('@/services/devfileApi');
jest.mock('@/services/workspace-client/devworkspace/devWorkspaceClient');
jest.mock('@/store/ClusterInfo/selectors');
jest.mock('@/store/InfrastructureNamespaces/selectors');
jest.mock('@/store/Plugins/devWorkspacePlugins/selectors');
jest.mock('@/store/ServerConfig/selectors');

describe('updateEditor', () => {
  let mockDevWorkspaceClient: DevWorkspaceClient;
  let mockPatchTemplate: jest.Mock;

  beforeEach(() => {
    mockDevWorkspaceClient = {
      checkForTemplatesUpdate: jest.fn(),
    } as unknown as DevWorkspaceClient;
    mockPatchTemplate = jest.fn();

    (container.get as jest.Mock).mockReturnValue(mockDevWorkspaceClient);
    (DwtApi.patchTemplate as jest.Mock).mockImplementation(mockPatchTemplate);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should update editor if updates are available', async () => {
    const editorName = 'test-editor';
    const namespace = 'test-namespace';
    const state = {
      dwPlugins: {
        defaultEditorName: 'default-editor',
        cmEditors: ['editor1', 'editor2'] as unknown as devfileApi.Devfile[],
      },
    } as Partial<RootState> as RootState;
    const store = createMockStore(state);

    jest
      .spyOn(infrastructureNamespace, 'selectDefaultNamespace')
      .mockReturnValue({ name: namespace } as che.KubernetesNamespace);

    (selectDwEditorsPluginsList as jest.Mock).mockReturnValue(() => [
      { url: 'plugin-url', devfile: {} },
    ]);

    jest.spyOn(serverConfig, 'selectOpenVSXUrl').mockReturnValue('https://openvsx.org');

    jest
      .spyOn(serverConfig, 'selectPluginRegistryUrl')
      .mockReturnValue('https://plugin-registry.com');

    jest
      .spyOn(serverConfig, 'selectPluginRegistryInternalUrl')
      .mockReturnValue('https://internal-plugin-registry.com');

    jest.spyOn(clusterInfo, 'selectApplications').mockReturnValue([
      {
        id: ApplicationId.CLUSTER_CONSOLE,
        url: 'https://cluster-console.com',
        icon: '',
        title: 'Console',
      },
    ]);

    (mockDevWorkspaceClient.checkForTemplatesUpdate as jest.Mock).mockResolvedValue(['update1']);

    await updateEditor(editorName, store.getState);

    expect(mockDevWorkspaceClient.checkForTemplatesUpdate).toHaveBeenCalledWith(
      editorName,
      namespace,
      ['editor1', 'editor2'],
      'https://plugin-registry.com',
      'https://internal-plugin-registry.com',
      'https://openvsx.org',
      {
        id: ApplicationId.CLUSTER_CONSOLE,
        url: 'https://cluster-console.com',
        icon: '',
        title: 'Console',
      },
    );

    expect(mockPatchTemplate).toHaveBeenCalledWith(namespace, editorName, ['update1']);
  });

  it('should not update editor if no updates are available', async () => {
    const editorName = 'test-editor';
    const namespace = 'test-namespace';
    const state = {
      dwPlugins: {
        defaultEditorName: 'default-editor',
        cmEditors: [] as unknown,
      },
    } as Partial<RootState> as RootState;
    const store = createMockStore(state);

    jest
      .spyOn(infrastructureNamespace, 'selectDefaultNamespace')
      .mockReturnValue({ name: namespace } as che.KubernetesNamespace);

    (selectDwEditorsPluginsList as jest.Mock).mockReturnValue(() => []);

    jest.spyOn(serverConfig, 'selectOpenVSXUrl').mockReturnValue('https://openvsx.org');

    jest
      .spyOn(serverConfig, 'selectPluginRegistryUrl')
      .mockReturnValue('https://plugin-registry.com');

    jest
      .spyOn(serverConfig, 'selectPluginRegistryInternalUrl')
      .mockReturnValue('https://internal-plugin-registry.com');

    jest.spyOn(clusterInfo, 'selectApplications').mockReturnValue([]);

    (mockDevWorkspaceClient.checkForTemplatesUpdate as jest.Mock).mockResolvedValue([]);

    await updateEditor(editorName, store.getState);

    expect(mockDevWorkspaceClient.checkForTemplatesUpdate).toHaveBeenCalled();
    expect(mockPatchTemplate).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    const editorName = 'test-editor';
    const namespace = 'test-namespace';
    const state = {
      dwPlugins: {
        defaultEditorName: 'default-editor',
        cmEditors: ['editor1'] as unknown[],
      },
    } as Partial<RootState> as RootState;
    const store = createMockStore(state);

    jest
      .spyOn(infrastructureNamespace, 'selectDefaultNamespace')
      .mockReturnValue({ name: namespace } as che.KubernetesNamespace);

    (selectDwEditorsPluginsList as jest.Mock).mockReturnValue(() => [
      { url: 'plugin-url', devfile: {} },
    ]);

    jest.spyOn(serverConfig, 'selectOpenVSXUrl').mockReturnValue('https://openvsx.org');

    jest
      .spyOn(serverConfig, 'selectPluginRegistryUrl')
      .mockReturnValue('https://plugin-registry.com');

    jest
      .spyOn(serverConfig, 'selectPluginRegistryInternalUrl')
      .mockReturnValue('https://internal-plugin-registry.com');

    jest.spyOn(clusterInfo, 'selectApplications').mockReturnValue([]);

    const error = new Error('Test error');
    (mockDevWorkspaceClient.checkForTemplatesUpdate as jest.Mock).mockRejectedValue(error);
    console.error = jest.fn();

    await updateEditor(editorName, store.getState);

    expect(mockDevWorkspaceClient.checkForTemplatesUpdate).toHaveBeenCalled();
    expect(mockPatchTemplate).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(error);
  });
});

describe('getEditorName', () => {
  it('should return undefined if contributions are empty', () => {
    const workspace = {
      spec: {
        contributions: [] as unknown[],
      },
    } as devfileApi.DevWorkspace;

    const result = getEditorName(workspace);
    expect(result).toBeUndefined();
  });

  it('should return undefined if contributions are undefined', () => {
    const workspace = {
      spec: {},
    } as devfileApi.DevWorkspace;

    const result = getEditorName(workspace);
    expect(result).toBeUndefined();
  });

  it('should return editor name if contribution named "editor" exists', () => {
    const workspace = {
      spec: {
        contributions: [
          {
            name: 'editor',
            kubernetes: {
              name: 'code-editor',
            },
          },
        ],
      },
    } as devfileApi.DevWorkspace;

    const result = getEditorName(workspace);
    expect(result).toBe('code-editor');
  });

  it('should return undefined if "editor" contribution does not have kubernetes name', () => {
    const workspace = {
      spec: {
        contributions: [
          {
            name: 'editor',
            kubernetes: {},
          },
        ],
      },
    } as devfileApi.DevWorkspace;

    const result = getEditorName(workspace);
    expect(result).toBeUndefined();
  });

  it('should return undefined if there is no contribution named "editor"', () => {
    const workspace = {
      spec: {
        contributions: [
          {
            name: 'some-other-contribution',
            kubernetes: {
              name: 'other-editor',
            },
          },
        ],
      },
    } as devfileApi.DevWorkspace;

    const result = getEditorName(workspace);
    expect(result).toBeUndefined();
  });
});

describe('getLifeTimeMs', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2023-01-01T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return correct lifetime in milliseconds', () => {
    const workspace = {
      metadata: {
        creationTimestamp: '2023-01-01T11:00:00Z' as unknown,
      },
    } as devfileApi.DevWorkspace;

    const result = getLifeTimeMs(workspace);
    expect(result).toBe(3600000); // 1 hour in milliseconds
  });

  it('should return 0 if creationTimestamp is undefined', () => {
    const workspace = {
      metadata: {},
    } as devfileApi.DevWorkspace;

    const result = getLifeTimeMs(workspace);
    expect(result).toBe(0);
  });
});
