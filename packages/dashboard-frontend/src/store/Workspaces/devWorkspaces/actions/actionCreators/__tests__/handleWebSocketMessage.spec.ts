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

import { api } from '@eclipse-che/common';

import { container } from '@/inversify.config';
import { injectKubeConfig, podmanLogin } from '@/services/backend-client/devWorkspaceApi';
import { WebsocketClient } from '@/services/backend-client/websocketClient';
import devfileApi, * as devfileApiService from '@/services/devfileApi';
import { DevWorkspaceStatus } from '@/services/helpers/types';
import { che } from '@/services/models';
import { WorkspaceAdapter } from '@/services/workspace-adapter';
import { RootState } from '@/store';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import * as infrastructureNamespaces from '@/store/InfrastructureNamespaces';
import {
  actionCreators,
  onStatusChangeCallbacks,
} from '@/store/Workspaces/devWorkspaces/actions/actionCreators';
import { handleWebSocketMessage } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/handleWebSocketMessage';
import { shouldUpdateDevWorkspace } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers';
import {
  devWorkspacesAddAction,
  devWorkspacesDeleteAction,
  devWorkspacesUpdateAction,
} from '@/store/Workspaces/devWorkspaces/actions/actions';

jest.mock('@eclipse-che/common');
jest.mock('@/services/backend-client/devWorkspaceApi');
jest.mock('@/services/devfileApi', () => ({
  ...jest.requireActual('@/services/devfileApi'),
  isDevWorkspace: jest.fn(),
}));
jest.mock('@/services/workspace-adapter');
jest.mock('@/store/Workspaces/devWorkspaces/actions/actionCreators');
jest.mock('@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers');
jest.mock('@/store/InfrastructureNamespaces');

describe('devWorkspaces, actions', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleWebSocketMessage', () => {
    let store: ReturnType<typeof createMockStore>;
    const mockWebsocketClient = {
      unsubscribeFromChannel: jest.fn(),
      subscribeToChannel: jest.fn(),
    };

    beforeEach(() => {
      store = createMockStore({
        devWorkspaces: {
          isLoading: false,
          resourceVersion: '1',
          startedWorkspaces: {},
          warnings: {},
          workspaces: [],
        },
      } as Partial<RootState> as RootState);

      jest
        .spyOn(infrastructureNamespaces, 'selectDefaultNamespace')
        .mockReturnValue({ name: 'default-namespace' } as che.KubernetesNamespace);
      (actionCreators.requestWorkspaces as jest.Mock).mockReturnValue(async () => {});
      (WorkspaceAdapter.getId as jest.Mock).mockImplementation(w => w.metadata.uid);
      (WorkspaceAdapter.getUID as jest.Mock).mockImplementation(w => w.metadata.uid);

      container.snapshot();
      container
        .rebind(WebsocketClient)
        .toConstantValue(mockWebsocketClient as unknown as WebsocketClient);
    });

    it('should handle status message and resubscribe on error status code', async () => {
      const message = {
        status: {
          code: 500,
          message: 'Internal Server Error',
        },
      } as api.webSocket.StatusMessage;

      (api.webSocket.isStatusMessage as unknown as jest.Mock).mockReturnValueOnce(true);

      await store.dispatch(handleWebSocketMessage(message));

      expect(mockWebsocketClient.unsubscribeFromChannel).toHaveBeenCalledWith(
        api.webSocket.Channel.DEV_WORKSPACE,
      );
      expect(actionCreators.requestWorkspaces).toHaveBeenCalled();
      expect(mockWebsocketClient.subscribeToChannel).toHaveBeenCalledWith(
        api.webSocket.Channel.DEV_WORKSPACE,
        'default-namespace',
        { getResourceVersion: expect.any(Function) },
      );
    });

    it('should handle dev workspace added event', async () => {
      const workspace = { metadata: { uid: 'workspace-uid' } } as devfileApi.DevWorkspace;
      const message: api.webSocket.DevWorkspaceMessage = {
        eventPhase: api.webSocket.EventPhase.ADDED,
        devWorkspace: workspace,
      };

      jest.spyOn(devfileApiService, 'isDevWorkspace').mockReturnValueOnce(true);
      (api.webSocket.isDevWorkspaceMessage as unknown as jest.Mock).mockReturnValueOnce(true);

      await store.dispatch(handleWebSocketMessage(message));

      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual(devWorkspacesAddAction(workspace));
    });

    it('should handle dev workspace modified event and update workspace', async () => {
      const prevWorkspace = {
        metadata: { uid: 'workspace-uid', resourceVersion: '1' },
        status: { phase: 'Starting' },
      } as devfileApi.DevWorkspace;
      const workspace = {
        metadata: { uid: 'workspace-uid', resourceVersion: '2' },
        status: { phase: 'Running' },
      } as devfileApi.DevWorkspace;

      const storeWithWorkspace = createMockStore({
        devWorkspaces: {
          isLoading: false,
          resourceVersion: '1',
          startedWorkspaces: {},
          warnings: {},
          workspaces: [prevWorkspace],
        },
      } as RootState);

      (shouldUpdateDevWorkspace as jest.Mock).mockReturnValueOnce(true);

      jest.spyOn(devfileApiService, 'isDevWorkspace').mockReturnValueOnce(true);
      (api.webSocket.isDevWorkspaceMessage as unknown as jest.Mock).mockReturnValueOnce(true);

      const message: api.webSocket.DevWorkspaceMessage = {
        eventPhase: api.webSocket.EventPhase.MODIFIED,
        devWorkspace: workspace,
      };

      await storeWithWorkspace.dispatch(handleWebSocketMessage(message));

      const actions = storeWithWorkspace.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual(devWorkspacesUpdateAction(workspace));
    });

    it('should handle dev workspace deleted event', async () => {
      const workspace = { metadata: { uid: 'workspace-uid' } } as devfileApi.DevWorkspace;
      const message: api.webSocket.DevWorkspaceMessage = {
        eventPhase: api.webSocket.EventPhase.DELETED,
        devWorkspace: workspace,
      };

      jest.spyOn(devfileApiService, 'isDevWorkspace').mockReturnValueOnce(true);
      (api.webSocket.isDevWorkspaceMessage as unknown as jest.Mock).mockReturnValueOnce(true);

      await store.dispatch(handleWebSocketMessage(message));

      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual(devWorkspacesDeleteAction(workspace));
    });

    it('should not dispatch if dev workspace is invalid', async () => {
      const message: api.webSocket.DevWorkspaceMessage = {
        eventPhase: api.webSocket.EventPhase.ADDED,
        devWorkspace: {},
      };

      jest.spyOn(devfileApiService, 'isDevWorkspace').mockReturnValueOnce(false);
      (api.webSocket.isDevWorkspaceMessage as unknown as jest.Mock).mockReturnValueOnce(true);

      await store.dispatch(handleWebSocketMessage(message));

      const actions = store.getActions();
      expect(actions).toHaveLength(0);
    });

    it('should handle unknown event phase', async () => {
      const workspace = { metadata: { uid: 'workspace-uid' } } as devfileApi.DevWorkspace;
      const message: api.webSocket.DevWorkspaceMessage = {
        eventPhase: 'UNKNOWN_PHASE' as unknown,
        devWorkspace: workspace,
      } as api.webSocket.DevWorkspaceMessage;

      jest.spyOn(devfileApiService, 'isDevWorkspace').mockReturnValueOnce(true);
      (api.webSocket.isDevWorkspaceMessage as unknown as jest.Mock).mockReturnValueOnce(true);

      console.warn = jest.fn();

      await store.dispatch(handleWebSocketMessage(message));

      expect(console.warn).toHaveBeenCalledWith('Unknown event phase in message: ', message);

      const actions = store.getActions();
      expect(actions).toHaveLength(0);
    });

    it('should call injectKubeConfig and podmanLogin when workspace status changes to RUNNING', async () => {
      const prevWorkspace = {
        metadata: { uid: 'workspace-uid' },
        status: { phase: DevWorkspaceStatus.STARTING },
      };
      const workspace = {
        metadata: { uid: 'workspace-uid', namespace: 'test-namespace' },
        status: { phase: DevWorkspaceStatus.RUNNING, devworkspaceId: 'devworkspace-id' },
      };

      (shouldUpdateDevWorkspace as jest.Mock).mockReturnValue(true);

      jest.spyOn(devfileApiService, 'isDevWorkspace').mockReturnValueOnce(true);
      (api.webSocket.isDevWorkspaceMessage as unknown as jest.Mock).mockReturnValueOnce(true);

      const storeWithWorkspace = createMockStore({
        devWorkspaces: {
          isLoading: false,
          resourceVersion: '1',
          startedWorkspaces: {},
          warnings: {},
          workspaces: [prevWorkspace],
        },
      } as Partial<RootState> as RootState);

      const message: api.webSocket.DevWorkspaceMessage = {
        eventPhase: api.webSocket.EventPhase.MODIFIED,
        devWorkspace: workspace,
      };

      await storeWithWorkspace.dispatch(handleWebSocketMessage(message));

      expect(injectKubeConfig).toHaveBeenCalledWith('test-namespace', 'devworkspace-id');
      expect(podmanLogin).toHaveBeenCalledWith('test-namespace', 'devworkspace-id');
    });

    it('should call status change listeners when workspace status changes', async () => {
      const prevWorkspace = {
        metadata: { uid: 'workspace-uid' },
        status: { phase: DevWorkspaceStatus.STARTING },
      } as devfileApi.DevWorkspace;
      const workspace = {
        metadata: { uid: 'workspace-uid' },
        status: { phase: DevWorkspaceStatus.RUNNING },
      } as devfileApi.DevWorkspace;

      const statusChangeCallback = jest.fn();
      onStatusChangeCallbacks.set('workspace-uid', statusChangeCallback);

      (shouldUpdateDevWorkspace as jest.Mock).mockReturnValue(true);

      jest.spyOn(devfileApiService, 'isDevWorkspace').mockReturnValueOnce(true);
      (api.webSocket.isDevWorkspaceMessage as unknown as jest.Mock).mockReturnValueOnce(true);

      const storeWithWorkspace = createMockStore({
        devWorkspaces: {
          isLoading: false,
          resourceVersion: '1',
          startedWorkspaces: {},
          warnings: {},
          workspaces: [prevWorkspace],
        },
      } as Partial<RootState> as RootState);

      const message: api.webSocket.DevWorkspaceMessage = {
        eventPhase: api.webSocket.EventPhase.MODIFIED,
        devWorkspace: workspace,
      };

      await storeWithWorkspace.dispatch(handleWebSocketMessage(message));

      expect(statusChangeCallback).toHaveBeenCalledWith(DevWorkspaceStatus.RUNNING);
    });

    it('should not call injectKubeConfig and podmanLogin if devworkspaceId is undefined', async () => {
      const prevWorkspace = {
        metadata: { uid: 'workspace-uid' },
        status: { phase: DevWorkspaceStatus.STARTING },
      } as devfileApi.DevWorkspace;
      const workspace = {
        metadata: { uid: 'workspace-uid', namespace: 'test-namespace' },
        status: { phase: DevWorkspaceStatus.RUNNING },
      } as devfileApi.DevWorkspace;

      (shouldUpdateDevWorkspace as jest.Mock).mockReturnValue(true);

      jest.spyOn(devfileApiService, 'isDevWorkspace').mockReturnValueOnce(true);
      (api.webSocket.isDevWorkspaceMessage as unknown as jest.Mock).mockReturnValueOnce(true);

      const storeWithWorkspace = createMockStore({
        devWorkspaces: {
          isLoading: false,
          resourceVersion: '1',
          startedWorkspaces: {},
          warnings: {},
          workspaces: [prevWorkspace],
        },
      } as Partial<RootState> as RootState);

      const message: api.webSocket.DevWorkspaceMessage = {
        eventPhase: api.webSocket.EventPhase.MODIFIED,
        devWorkspace: workspace,
      };

      await storeWithWorkspace.dispatch(handleWebSocketMessage(message));

      expect(injectKubeConfig).not.toHaveBeenCalled();
      expect(podmanLogin).not.toHaveBeenCalled();
    });
  });
});
