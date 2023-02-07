/*
 * Copyright (c) 2018-2023 Red Hat, Inc.
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

import { api } from '@eclipse-che/common';
import { V1Status } from '@kubernetes/client-node';
import { AnyAction } from 'redux';
import { MockStoreEnhanced } from 'redux-mock-store';
import { ThunkDispatch } from 'redux-thunk';
import * as testStore from '..';
import { AppState } from '../../..';
import { container } from '../../../../inversify.config';
import { fetchServerConfig } from '../../../../services/dashboard-backend-client/serverConfigApi';
import { WebsocketClient } from '../../../../services/dashboard-backend-client/websocketClient';
import devfileApi from '../../../../services/devfileApi';
import { DevWorkspaceClient } from '../../../../services/workspace-client/devworkspace/devWorkspaceClient';
import { AUTHORIZED } from '../../../sanityCheckMiddleware';
import * as ServerConfigStore from '../../../ServerConfig';
import { DevWorkspaceBuilder } from '../../../__mocks__/devWorkspaceBuilder';
import { FakeStoreBuilder } from '../../../__mocks__/storeBuilder';
import { checkRunningWorkspacesLimit } from '../checkRunningWorkspacesLimit';

jest.mock('../../../../services/dashboard-backend-client/serverConfigApi.ts');
jest.mock('../../../../services/helpers/delay', () => ({
  delay: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../checkRunningWorkspacesLimit.ts');

// DevWorkspaceClient mocks
const mockChangeWorkspaceStatus = jest.fn();
const mockCheckForDevWorkspaceError = jest.fn();
const mockCreateFromDevfile = jest.fn();
const mockCreateFromResources = jest.fn();
const mockDelete = jest.fn();
const mockGetAllWorkspaces = jest.fn();
const mockGetWorkspaceByName = jest.fn();
const mockManageContainerBuildAttribute = jest.fn();
const mockManageDebugMode = jest.fn();
const mockManagePvcStrategy = jest.fn();
const mockOnStart = jest.fn();
const mockUpdate = jest.fn();
const mockUpdateAnnotation = jest.fn();

describe('DevWorkspace store, actions', () => {
  const devWorkspaceClient = container.get(DevWorkspaceClient);

  let storeBuilder: FakeStoreBuilder;
  let store: MockStoreEnhanced<AppState, ThunkDispatch<AppState, undefined, AnyAction>>;

  beforeEach(() => {
    container.snapshot();
    devWorkspaceClient.changeWorkspaceStatus = mockChangeWorkspaceStatus;
    devWorkspaceClient.checkForDevWorkspaceError = mockCheckForDevWorkspaceError;
    devWorkspaceClient.createFromDevfile = mockCreateFromDevfile;
    devWorkspaceClient.createFromResources = mockCreateFromResources;
    devWorkspaceClient.delete = mockDelete;
    devWorkspaceClient.getAllWorkspaces = mockGetAllWorkspaces;
    devWorkspaceClient.getWorkspaceByName = mockGetWorkspaceByName;
    devWorkspaceClient.manageContainerBuildAttribute = mockManageContainerBuildAttribute;
    devWorkspaceClient.manageDebugMode = mockManageDebugMode;
    devWorkspaceClient.managePvcStrategy = mockManagePvcStrategy;
    devWorkspaceClient.onStart = mockOnStart;
    devWorkspaceClient.update = mockUpdate;
    devWorkspaceClient.updateAnnotation = mockUpdateAnnotation;

    storeBuilder = new FakeStoreBuilder().withInfrastructureNamespace([
      { name: 'user-che', attributes: { default: 'true', phase: 'Active' } },
    ]);
    store = storeBuilder.build();
  });

  afterEach(() => {
    container.restore();
    jest.resetAllMocks();
  });

  describe('requestWorkspaces', () => {
    it('should create REQUEST_DEVWORKSPACE and RECEIVE_DEVWORKSPACE when fetching DevWorkspaces', async () => {
      mockGetAllWorkspaces.mockResolvedValueOnce({ workspaces: [], resourceVersion: '' });

      await store.dispatch(testStore.actionCreators.requestWorkspaces());
      const actions = store.getActions();

      const expectedActions: testStore.KnownAction[] = [
        {
          type: testStore.Type.REQUEST_DEVWORKSPACE,
          check: AUTHORIZED,
        },
        {
          type: testStore.Type.RECEIVE_DEVWORKSPACE,
          workspaces: [],
          resourceVersion: '',
        },
        {
          type: testStore.Type.UPDATE_STARTED_WORKSPACES,
          workspaces: [],
        },
      ];

      expect(actions).toEqual(expectedActions);
    });

    it('should create REQUEST_DEVWORKSPACE, RECEIVE_DEVWORKSPACE and UPDATE_DEVWORKSPACE when fetching DevWorkspaces', async () => {
      const devWorkspace = new DevWorkspaceBuilder().build();

      mockGetAllWorkspaces.mockResolvedValueOnce({
        workspaces: [devWorkspace],
        resourceVersion: '1234',
      });
      mockUpdate.mockResolvedValueOnce(devWorkspace);

      await store.dispatch(testStore.actionCreators.requestWorkspaces());
      const actions = store.getActions();

      const expectedActions: testStore.KnownAction[] = [
        {
          type: testStore.Type.REQUEST_DEVWORKSPACE,
          check: AUTHORIZED,
        },
        {
          type: testStore.Type.RECEIVE_DEVWORKSPACE,
          resourceVersion: '1234',
          workspaces: [devWorkspace],
        },
        {
          type: testStore.Type.UPDATE_STARTED_WORKSPACES,
          workspaces: [devWorkspace],
        },
        {
          check: AUTHORIZED,
          type: testStore.Type.REQUEST_DEVWORKSPACE,
        },
        {
          type: testStore.Type.UPDATE_DEVWORKSPACE,
          workspace: devWorkspace,
        },
      ];

      expect(actions).toEqual(expectedActions);
    });

    it('should create REQUEST_DEVWORKSPACE and RECEIVE_DEVWORKSPACE_ERROR when fails to fetch DevWorkspaces', async () => {
      mockGetAllWorkspaces.mockRejectedValueOnce(new Error('Something unexpected happened.'));

      try {
        await store.dispatch(testStore.actionCreators.requestWorkspaces());
      } catch (e) {
        // noop
      }

      const actions = store.getActions();

      const expectedActions: testStore.KnownAction[] = [
        {
          type: testStore.Type.REQUEST_DEVWORKSPACE,
          check: AUTHORIZED,
        },
        {
          type: testStore.Type.RECEIVE_DEVWORKSPACE_ERROR,
          error: 'Failed to fetch available workspaces, reason: Something unexpected happened.',
        },
      ];

      expect(actions).toEqual(expectedActions);
    });
  });

  describe('requestWorkspace', () => {
    it('should create REQUEST_DEVWORKSPACE and UPDATE_DEVWORKSPACE when updating DevWorkspace', async () => {
      const devWorkspace = new DevWorkspaceBuilder().build();

      mockGetWorkspaceByName.mockResolvedValueOnce(devWorkspace);
      mockUpdate.mockResolvedValueOnce(devWorkspace);

      await store.dispatch(testStore.actionCreators.requestWorkspace(devWorkspace));
      const actions = store.getActions();

      const expectedActions: testStore.KnownAction[] = [
        {
          type: testStore.Type.REQUEST_DEVWORKSPACE,
          check: AUTHORIZED,
        },
        {
          type: testStore.Type.UPDATE_DEVWORKSPACE,
          workspace: devWorkspace,
        },
        {
          check: AUTHORIZED,
          type: testStore.Type.REQUEST_DEVWORKSPACE,
        },
        {
          type: testStore.Type.UPDATE_DEVWORKSPACE,
          workspace: devWorkspace,
        },
      ];

      expect(actions).toEqual(expectedActions);
    });

    it('should create REQUEST_DEVWORKSPACE and RECEIVE_DEVWORKSPACE_ERROR when fails to fetch a DevWorkspace', async () => {
      const devWorkspace = new DevWorkspaceBuilder().build();

      mockGetWorkspaceByName.mockRejectedValueOnce(new Error('Something unexpected happened.'));

      try {
        await store.dispatch(testStore.actionCreators.requestWorkspace(devWorkspace));
      } catch (e) {
        // noop
      }

      const actions = store.getActions();

      const expectedActions: testStore.KnownAction[] = [
        {
          type: testStore.Type.REQUEST_DEVWORKSPACE,
          check: AUTHORIZED,
        },
        {
          type: testStore.Type.RECEIVE_DEVWORKSPACE_ERROR,
          error: `Failed to fetch the workspace ${devWorkspace.metadata.name}, reason: Something unexpected happened.`,
        },
      ];

      expect(actions).toEqual(expectedActions);
    });
  });

  describe('startWorkspace', () => {
    it('should create REQUEST_DEVWORKSPACE and UPDATE_DEVWORKSPACE when starting DevWorkspace', async () => {
      const devWorkspace = new DevWorkspaceBuilder().build();

      (checkRunningWorkspacesLimit as jest.Mock).mockImplementation(() => undefined);

      (fetchServerConfig as jest.Mock).mockResolvedValueOnce({});

      mockChangeWorkspaceStatus.mockResolvedValueOnce(devWorkspace);
      mockManageContainerBuildAttribute.mockResolvedValueOnce(devWorkspace);
      mockManageDebugMode.mockResolvedValueOnce(devWorkspace);
      mockManagePvcStrategy.mockResolvedValueOnce(devWorkspace);
      mockOnStart.mockResolvedValueOnce(devWorkspace);
      mockUpdate.mockResolvedValueOnce(devWorkspace);
      mockOnStart.mockResolvedValueOnce(devWorkspace);
      mockCheckForDevWorkspaceError.mockReturnValueOnce(devWorkspace);

      const store = storeBuilder.withDevWorkspaces({ workspaces: [devWorkspace] }).build();

      await store.dispatch(testStore.actionCreators.startWorkspace(devWorkspace));

      const actions = store.getActions();

      const expectedActions: Array<testStore.KnownAction | ServerConfigStore.KnownAction> = [
        {
          type: testStore.Type.REQUEST_DEVWORKSPACE,
          check: AUTHORIZED,
        },
        {
          check: AUTHORIZED,
          type: 'REQUEST_DW_SERVER_CONFIG',
        },
        {
          config: {} as api.IServerConfig,
          type: 'RECEIVE_DW_SERVER_CONFIG',
        },
        {
          type: testStore.Type.UPDATE_DEVWORKSPACE,
          workspace: devWorkspace,
        },
      ];

      expect(actions).toEqual(expectedActions);
    });

    it('should create REQUEST_DEVWORKSPACE and RECEIVE_DEVWORKSPACE_ERROR when failed to start a DevWorkspace', async () => {
      const devWorkspace = new DevWorkspaceBuilder().build();

      (checkRunningWorkspacesLimit as jest.Mock).mockImplementation(() => {
        throw new Error('Limit reached.');
      });

      mockChangeWorkspaceStatus.mockResolvedValueOnce(devWorkspace);
      mockManageContainerBuildAttribute.mockResolvedValueOnce(devWorkspace);
      mockManageDebugMode.mockResolvedValueOnce(devWorkspace);
      mockManagePvcStrategy.mockResolvedValueOnce(devWorkspace);
      mockOnStart.mockResolvedValueOnce(devWorkspace);
      mockUpdate.mockResolvedValueOnce(devWorkspace);
      mockOnStart.mockResolvedValueOnce(devWorkspace);
      mockCheckForDevWorkspaceError.mockReturnValueOnce(devWorkspace);

      const store = storeBuilder.withDevWorkspaces({ workspaces: [devWorkspace] }).build();

      try {
        await store.dispatch(testStore.actionCreators.startWorkspace(devWorkspace));
      } catch (e) {
        // no-op
      }

      const actions = store.getActions();

      const expectedActions: Array<testStore.KnownAction | ServerConfigStore.KnownAction> = [
        {
          type: testStore.Type.REQUEST_DEVWORKSPACE,
          check: AUTHORIZED,
        },
        {
          type: testStore.Type.RECEIVE_DEVWORKSPACE_ERROR,
          error: `Failed to start the workspace ${devWorkspace.metadata.name}, reason: Limit reached.`,
        },
      ];

      expect(actions).toEqual(expectedActions);
    });
  });

  describe('stopWorkspace', () => {
    it('should create no actions', async () => {
      const devWorkspace = new DevWorkspaceBuilder().build();

      mockChangeWorkspaceStatus.mockResolvedValueOnce(devWorkspace);

      await store.dispatch(testStore.actionCreators.stopWorkspace(devWorkspace));

      const actions = store.getActions();

      const expectedActions: Array<testStore.KnownAction> = [];

      expect(actions).toEqual(expectedActions);
    });

    it('should create RECEIVE_DEVWORKSPACE_ERROR when fails to stop DevWorkspace', async () => {
      const devWorkspace = new DevWorkspaceBuilder().build();

      mockChangeWorkspaceStatus.mockRejectedValueOnce(new Error('Something unexpected happened.'));

      try {
        await store.dispatch(testStore.actionCreators.stopWorkspace(devWorkspace));
      } catch (e) {
        // no-op
      }

      const actions = store.getActions();

      const expectedActions: Array<testStore.KnownAction> = [
        {
          type: testStore.Type.RECEIVE_DEVWORKSPACE_ERROR,
          error: `Failed to stop the workspace ${devWorkspace.metadata.name}, reason: Something unexpected happened.`,
        },
      ];

      expect(actions).toEqual(expectedActions);
    });
  });

  describe('terminateWorkspace', () => {
    it('should create TERMINATE_DEVWORKSPACE when succeeded to terminate a DevWorkspace', async () => {
      const devWorkspace = new DevWorkspaceBuilder().build();

      mockDelete.mockResolvedValueOnce(undefined);

      await store.dispatch(testStore.actionCreators.terminateWorkspace(devWorkspace));

      const actions = store.getActions();

      const expectedActions: Array<testStore.KnownAction> = [
        {
          message: 'Cleaning up resources for deletion',
          type: testStore.Type.TERMINATE_DEVWORKSPACE,
          workspaceUID: devWorkspace.metadata.uid,
        },
      ];

      expect(actions).toEqual(expectedActions);
    });

    it('should create RECEIVE_DEVWORKSPACE_ERROR when fails to terminate a DevWorkspace', async () => {
      const devWorkspace = new DevWorkspaceBuilder().build();

      mockDelete.mockRejectedValueOnce('Something unexpected happened.');

      try {
        await store.dispatch(testStore.actionCreators.terminateWorkspace(devWorkspace));
      } catch (e) {
        // no-op
      }

      const actions = store.getActions();

      const expectedActions: Array<testStore.KnownAction> = [
        {
          type: testStore.Type.RECEIVE_DEVWORKSPACE_ERROR,
          error: `Failed to delete the workspace ${devWorkspace.metadata.name}, reason: Something unexpected happened.`,
        },
      ];

      expect(actions).toEqual(expectedActions);
    });
  });

  describe('updateWorkspaceAnnotation', () => {
    it('should create REQUEST_DEVWORKSPACE and UPDATE_DEVWORKSPACE when updating a workspace annotation', async () => {
      const devWorkspace = new DevWorkspaceBuilder().build();

      mockUpdateAnnotation.mockResolvedValueOnce(devWorkspace);

      await store.dispatch(testStore.actionCreators.updateWorkspaceAnnotation(devWorkspace));

      const actions = store.getActions();

      const expectedActions: Array<testStore.KnownAction> = [
        {
          type: testStore.Type.REQUEST_DEVWORKSPACE,
          check: AUTHORIZED,
        },
        {
          type: testStore.Type.UPDATE_DEVWORKSPACE,
          workspace: devWorkspace,
        },
      ];

      expect(actions).toEqual(expectedActions);
    });

    it('should create REQUEST_DEVWORKSPACE and RECEIVE_DEVWORKSPACE_ERROR when fails to update a workspace annotation', async () => {
      const devWorkspace = new DevWorkspaceBuilder().build();

      mockUpdateAnnotation.mockRejectedValueOnce(new Error('Something unexpected happened.'));

      try {
        await store.dispatch(testStore.actionCreators.updateWorkspaceAnnotation(devWorkspace));
      } catch (e) {
        // no-op
      }

      const actions = store.getActions();

      const expectedActions: Array<testStore.KnownAction> = [
        {
          type: testStore.Type.REQUEST_DEVWORKSPACE,
          check: AUTHORIZED,
        },
        {
          error: `Failed to update the workspace ${devWorkspace.metadata.name}, reason: Something unexpected happened.`,
          type: testStore.Type.RECEIVE_DEVWORKSPACE_ERROR,
        },
      ];

      expect(actions).toEqual(expectedActions);
    });
  });

  describe('updateWorkspace', () => {
    it('should create REQUEST_DEVWORKSPACE and UPDATE_DEVWORKSPACE when updating a workspace annotation', async () => {
      const devWorkspace = new DevWorkspaceBuilder().build();

      mockUpdate.mockResolvedValueOnce(devWorkspace);

      await store.dispatch(testStore.actionCreators.updateWorkspace(devWorkspace));

      const actions = store.getActions();

      const expectedActions: Array<testStore.KnownAction> = [
        {
          type: testStore.Type.REQUEST_DEVWORKSPACE,
          check: AUTHORIZED,
        },
        {
          type: testStore.Type.UPDATE_DEVWORKSPACE,
          workspace: devWorkspace,
        },
      ];

      expect(actions).toEqual(expectedActions);
    });

    it('should create REQUEST_DEVWORKSPACE and RECEIVE_DEVWORKSPACE_ERROR when fails to update a workspace annotation', async () => {
      const devWorkspace = new DevWorkspaceBuilder().build();

      mockUpdate.mockRejectedValueOnce(new Error('Something unexpected happened.'));

      try {
        await store.dispatch(testStore.actionCreators.updateWorkspace(devWorkspace));
      } catch (e) {
        // no-op
      }

      const actions = store.getActions();

      const expectedActions: Array<testStore.KnownAction> = [
        {
          type: testStore.Type.REQUEST_DEVWORKSPACE,
          check: AUTHORIZED,
        },
        {
          error: `Failed to update the workspace ${devWorkspace.metadata.name}, reason: Something unexpected happened.`,
          type: testStore.Type.RECEIVE_DEVWORKSPACE_ERROR,
        },
      ];

      expect(actions).toEqual(expectedActions);
    });
  });

  describe('createWorkspaceFromResources', () => {
    it('should create ADD_DEVWORKSPACE when creating a new workspace from resources', async () => {
      const devWorkspace = new DevWorkspaceBuilder().build();
      const devWorkspaceTemplate: devfileApi.DevWorkspaceTemplate = {
        apiVersion: 'v1alpha2',
        kind: 'DevWorkspaceTemplate',
        metadata: {
          name: 'template',
          namespace: 'user-che',
          annotations: {},
        },
      };

      mockCreateFromResources.mockResolvedValueOnce(devWorkspace);
      mockOnStart.mockResolvedValueOnce(undefined);

      await store.dispatch(
        testStore.actionCreators.createWorkspaceFromResources(devWorkspace, devWorkspaceTemplate),
      );

      const actions = store.getActions();

      const expectedActions: Array<testStore.KnownAction> = [
        {
          type: testStore.Type.ADD_DEVWORKSPACE,
          workspace: devWorkspace,
        },
      ];

      expect(actions).toEqual(expectedActions);
    });

    it('should create RECEIVE_DEVWORKSPACE_ERROR when fails to create a new workspace from resources', async () => {
      const devWorkspace = new DevWorkspaceBuilder().build();
      const devWorkspaceTemplate: devfileApi.DevWorkspaceTemplate = {
        apiVersion: 'v1alpha2',
        kind: 'DevWorkspaceTemplate',
        metadata: {
          name: 'template',
          namespace: 'user-che',
          annotations: {},
        },
      };

      mockCreateFromResources.mockRejectedValueOnce(new Error('Something unexpected happened.'));

      try {
        await store.dispatch(
          testStore.actionCreators.createWorkspaceFromResources(devWorkspace, devWorkspaceTemplate),
        );
      } catch (e) {
        // no-op
      }

      const actions = store.getActions();

      const expectedActions: Array<testStore.KnownAction> = [
        {
          error: `Failed to create a new workspace, reason: Something unexpected happened.`,
          type: testStore.Type.RECEIVE_DEVWORKSPACE_ERROR,
        },
      ];

      expect(actions).toEqual(expectedActions);
    });
  });

  describe('createWorkspaceFromDevfile', () => {
    it('should create REQUEST_DEVWORKSPACE and ADD_DEVWORKSPACE when creating a new workspace from devfile', async () => {
      const devWorkspace = new DevWorkspaceBuilder().build();
      const devfile: devfileApi.Devfile = {
        schemaVersion: '2.1.0',
        metadata: {
          name: 'test',
          namespace: 'user-che',
        },
      };

      mockCreateFromDevfile.mockResolvedValueOnce(devWorkspace);
      mockOnStart.mockResolvedValueOnce(undefined);

      await store.dispatch(
        testStore.actionCreators.createWorkspaceFromDevfile(devfile, {}, undefined, undefined, {}),
      );

      const actions = store.getActions();

      const expectedActions: Array<testStore.KnownAction> = [
        {
          type: testStore.Type.REQUEST_DEVWORKSPACE,
          check: AUTHORIZED,
        },
        {
          type: testStore.Type.ADD_DEVWORKSPACE,
          workspace: devWorkspace,
        },
      ];

      expect(actions).toEqual(expectedActions);
    });

    it('should create REQUEST_DEVWORKSPACE and RECEIVE_DEVWORKSPACE_ERROR when fails to create a new workspace from devfile', async () => {
      const devWorkspace = new DevWorkspaceBuilder().build();
      const devfile: devfileApi.Devfile = {
        schemaVersion: '2.1.0',
        metadata: {
          name: 'test',
          namespace: 'user-che',
        },
      };

      mockCreateFromDevfile.mockRejectedValueOnce(new Error('Something unexpected happened.'));
      // mockOnStart.mockResolvedValueOnce(undefined);

      try {
        await store.dispatch(
          testStore.actionCreators.createWorkspaceFromDevfile(
            devfile,
            {},
            undefined,
            undefined,
            {},
          ),
        );
      } catch (e) {
        // no-op
      }

      const actions = store.getActions();

      const expectedActions: Array<testStore.KnownAction> = [
        {
          type: testStore.Type.REQUEST_DEVWORKSPACE,
          check: AUTHORIZED,
        },
        {
          error: `Something unexpected happened.`,
          type: testStore.Type.RECEIVE_DEVWORKSPACE_ERROR,
        },
      ];

      expect(actions).toEqual(expectedActions);
    });
  });

  describe('handleWebSocketMessage', () => {
    it('should create ADD_DEVWORKSPACE when event phase equals ADDED', async () => {
      const devWorkspace = new DevWorkspaceBuilder().build();

      await store.dispatch(
        testStore.actionCreators.handleWebSocketMessage({
          eventPhase: api.webSocket.EventPhase.ADDED,
          devWorkspace,
        }),
      );

      const actions = store.getActions();

      const expectedActions: Array<testStore.KnownAction> = [
        {
          type: testStore.Type.ADD_DEVWORKSPACE,
          workspace: devWorkspace,
        },
        {
          type: testStore.Type.UPDATE_STARTED_WORKSPACES,
          workspaces: [devWorkspace],
        },
      ];

      expect(actions).toEqual(expectedActions);
    });

    it('should create UPDATE_DEVWORKSPACE when event phase equals MODIFIED', async () => {
      const devWorkspace = new DevWorkspaceBuilder().build();

      await store.dispatch(
        testStore.actionCreators.handleWebSocketMessage({
          eventPhase: api.webSocket.EventPhase.MODIFIED,
          devWorkspace,
        }),
      );

      const actions = store.getActions();

      const expectedActions: Array<testStore.KnownAction> = [
        {
          type: testStore.Type.UPDATE_DEVWORKSPACE,
          workspace: devWorkspace,
        },
        {
          type: testStore.Type.UPDATE_STARTED_WORKSPACES,
          workspaces: [devWorkspace],
        },
      ];

      expect(actions).toEqual(expectedActions);
    });

    it('should create DELETE_DEVWORKSPACE when event phase equals DELETED', async () => {
      const devWorkspace = new DevWorkspaceBuilder().build();

      await store.dispatch(
        testStore.actionCreators.handleWebSocketMessage({
          eventPhase: api.webSocket.EventPhase.DELETED,
          devWorkspace,
        }),
      );

      const actions = store.getActions();

      const expectedActions: Array<testStore.KnownAction> = [
        {
          type: testStore.Type.DELETE_DEVWORKSPACE,
          workspace: devWorkspace,
        },
        {
          type: testStore.Type.UPDATE_STARTED_WORKSPACES,
          workspaces: [devWorkspace],
        },
      ];

      expect(actions).toEqual(expectedActions);
    });

    it('should create REQUEST_DEVWORKSPACE and RECEIVE_DEVWORKSPACE and resubscribe to channel', async () => {
      mockGetAllWorkspaces.mockResolvedValueOnce({ workspaces: [], resourceVersion: '123' });

      const websocketClient = container.get(WebsocketClient);
      const unsubscribeFromChannelSpy = jest
        .spyOn(websocketClient, 'unsubscribeFromChannel')
        .mockReturnValue(undefined);
      const subscribeToChannelSpy = jest
        .spyOn(websocketClient, 'subscribeToChannel')
        .mockReturnValue(undefined);

      const namespace = 'user-che';
      const appStoreWithNamespace = new FakeStoreBuilder()
        .withInfrastructureNamespace([{ name: namespace, attributes: { phase: 'Active' } }])
        .build() as MockStoreEnhanced<
        AppState,
        ThunkDispatch<AppState, undefined, testStore.KnownAction>
      >;
      await appStoreWithNamespace.dispatch(
        testStore.actionCreators.handleWebSocketMessage({
          status: {
            code: 410,
            message: 'The resourceVersion for the provided watch is too old.',
          } as V1Status,
          eventPhase: api.webSocket.EventPhase.ERROR,
        }),
      );

      const actions = appStoreWithNamespace.getActions();

      const expectedActions: testStore.KnownAction[] = [
        {
          check: AUTHORIZED,
          type: testStore.Type.REQUEST_DEVWORKSPACE,
        },
        {
          type: testStore.Type.RECEIVE_DEVWORKSPACE,
          workspaces: [],
          resourceVersion: '123',
        },
        {
          type: testStore.Type.UPDATE_STARTED_WORKSPACES,
          workspaces: [],
        },
      ];

      expect(actions).toEqual(expectedActions);
      expect(unsubscribeFromChannelSpy).toHaveBeenCalledWith(api.webSocket.Channel.DEV_WORKSPACE);
      expect(subscribeToChannelSpy).toHaveBeenCalledWith(
        api.webSocket.Channel.DEV_WORKSPACE,
        namespace,
        expect.any(Function),
      );
    });
  });
});
