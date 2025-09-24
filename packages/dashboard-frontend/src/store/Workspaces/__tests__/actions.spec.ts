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

import devfileApi from '@/services/devfileApi';
import { FactoryParams } from '@/services/helpers/factoryFlow/buildFactoryParams';
import { constructWorkspace, Workspace } from '@/services/workspace-adapter';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import {
  actionCreators,
  qualifiedNameClearAction,
  qualifiedNameSetAction,
  workspaceUIDClearAction,
  workspaceUIDSetAction,
} from '@/store/Workspaces/actions';
import { devWorkspacesActionCreators } from '@/store/Workspaces/devWorkspaces';
import * as devWorkspaces from '@/store/Workspaces/devWorkspaces';

jest.mock('@/services/devfileApi');

describe('Workspaces Actions', () => {
  let store: ReturnType<typeof createMockStore>;
  let mockWorkspace: Workspace;

  beforeEach(() => {
    store = createMockStore({});

    const devWorkspace = new DevWorkspaceBuilder().withName('test-workspace').build();
    mockWorkspace = constructWorkspace(devWorkspace);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requestWorkspaces', () => {
    it('should dispatch requestWorkspaces action', async () => {
      const mockRequestDevWorkspaces = jest.fn();
      jest
        .spyOn(devWorkspacesActionCreators, 'requestWorkspaces')
        .mockImplementationOnce(() => async () => mockRequestDevWorkspaces());

      await store.dispatch(actionCreators.requestWorkspaces());

      const actions = store.getActions();
      expect(actions).toHaveLength(0);

      expect(mockRequestDevWorkspaces).toHaveBeenCalled();
    });
  });

  describe('requestWorkspace', () => {
    it('should dispatch requestWorkspace action', async () => {
      const mockRequestDevWorkspace = jest.fn();
      jest
        .spyOn(devWorkspaces.devWorkspacesActionCreators, 'requestWorkspace')
        .mockImplementationOnce(
          (...args: unknown[]) =>
            async () =>
              mockRequestDevWorkspace(...args),
        );

      await store.dispatch(actionCreators.requestWorkspace(mockWorkspace));

      const actions = store.getActions();
      expect(actions).toHaveLength(0);

      expect(mockRequestDevWorkspace).toHaveBeenCalledWith(mockWorkspace.ref);
    });
  });

  describe('startWorkspace', () => {
    it('should dispatch startWorkspace action with debugWorkspace', async () => {
      const params = { 'debug-workspace-start': true };

      const mockStartWorkspace = jest.fn();
      jest.spyOn(devWorkspacesActionCreators, 'startWorkspace').mockImplementationOnce(
        (...args: unknown[]) =>
          async () =>
            mockStartWorkspace(...args),
      );

      await store.dispatch(actionCreators.startWorkspace(mockWorkspace, params));

      const actions = store.getActions();
      expect(actions).toHaveLength(0);

      expect(mockStartWorkspace).toHaveBeenCalledWith(mockWorkspace.ref, true);
    });

    it('should dispatch startWorkspace action without debugWorkspace', async () => {
      const mockStartWorkspace = jest.fn();
      jest.spyOn(devWorkspacesActionCreators, 'startWorkspace').mockImplementationOnce(
        (...args: unknown[]) =>
          async () =>
            mockStartWorkspace(...args),
      );

      await store.dispatch(actionCreators.startWorkspace(mockWorkspace));

      const actions = store.getActions();
      expect(actions).toHaveLength(0);

      expect(mockStartWorkspace).toHaveBeenCalledWith(mockWorkspace.ref, undefined);
    });
  });

  describe('restartWorkspace', () => {
    it('should dispatch restartWorkspace action', async () => {
      const mockRestartWorkspace = jest.fn();
      jest.spyOn(devWorkspacesActionCreators, 'restartWorkspace').mockImplementationOnce(
        (...args: unknown[]) =>
          async () =>
            mockRestartWorkspace(...args),
      );

      await store.dispatch(actionCreators.restartWorkspace(mockWorkspace));

      const actions = store.getActions();
      expect(actions).toHaveLength(0);

      expect(mockRestartWorkspace).toHaveBeenCalledWith(mockWorkspace.ref);
    });
  });

  describe('stopWorkspace', () => {
    it('should dispatch stopWorkspace action', async () => {
      const mockStopWorkspace = jest.fn();
      jest.spyOn(devWorkspacesActionCreators, 'stopWorkspace').mockImplementationOnce(
        (...args: unknown[]) =>
          async () =>
            mockStopWorkspace(...args),
      );

      await store.dispatch(actionCreators.stopWorkspace(mockWorkspace));

      const actions = store.getActions();
      expect(actions).toHaveLength(0);

      expect(mockStopWorkspace).toHaveBeenCalledWith(mockWorkspace.ref);
    });
  });

  describe('deleteWorkspace', () => {
    it('should dispatch deleteWorkspace action', async () => {
      const mockDeleteWorkspace = jest.fn();
      jest.spyOn(devWorkspacesActionCreators, 'terminateWorkspace').mockImplementationOnce(
        (...args: unknown[]) =>
          async () =>
            mockDeleteWorkspace(...args),
      );

      await store.dispatch(actionCreators.deleteWorkspace(mockWorkspace));

      const actions = store.getActions();
      expect(actions).toHaveLength(0);

      expect(mockDeleteWorkspace).toHaveBeenCalledWith(mockWorkspace.ref);
    });
  });

  describe('updateWorkspace', () => {
    it('should dispatch updateWorkspace action', async () => {
      const mockUpdateWorkspace = jest.fn();
      jest.spyOn(devWorkspacesActionCreators, 'updateWorkspace').mockImplementationOnce(
        (...args: unknown[]) =>
          async () =>
            mockUpdateWorkspace(...args),
      );

      await store.dispatch(actionCreators.updateWorkspace(mockWorkspace));

      const actions = store.getActions();
      expect(actions).toHaveLength(0);

      expect(mockUpdateWorkspace).toHaveBeenCalledWith(mockWorkspace.ref);
    });
  });

  describe('updateWorkspaceWithDefaultDevfile', () => {
    it('should dispatch updateWorkspaceWithDefaultDevfile action', async () => {
      const mockUpdateWorkspace = jest.fn();
      jest
        .spyOn(devWorkspacesActionCreators, 'updateWorkspaceWithDefaultDevfile')
        .mockImplementationOnce(
          (...args: unknown[]) =>
            async () =>
              mockUpdateWorkspace(...args),
        );

      await store.dispatch(actionCreators.updateWorkspaceWithDefaultDevfile(mockWorkspace));

      const actions = store.getActions();
      expect(actions).toHaveLength(0);

      expect(mockUpdateWorkspace).toHaveBeenCalledWith(mockWorkspace.ref);
    });
  });

  describe('createWorkspaceFromDevfile', () => {
    it('should dispatch createWorkspaceFromDevfile action', async () => {
      const mockDevfile = {} as devfileApi.Devfile;
      const mockAttributes = {} as Partial<FactoryParams>;
      const mockOptionalFilesContent = {
        'README.md': { location: 'location', content: 'Content' },
      };

      const mockCreateWorkspace = jest.fn();
      jest.spyOn(devWorkspacesActionCreators, 'createWorkspaceFromDevfile').mockImplementationOnce(
        (...args: unknown[]) =>
          async () =>
            mockCreateWorkspace(...args),
      );

      await store.dispatch(
        actionCreators.createWorkspaceFromDevfile(
          mockDevfile,
          mockAttributes,
          mockOptionalFilesContent,
        ),
      );

      const actions = store.getActions();
      expect(actions).toHaveLength(0);

      expect(mockCreateWorkspace).toHaveBeenCalledWith(
        mockDevfile,
        mockAttributes,
        mockOptionalFilesContent,
      );
    });
  });

  describe('setWorkspaceQualifiedName', () => {
    it('should dispatch setWorkspaceQualifiedName action', () => {
      const namespace = 'test-namespace';
      const workspaceName = 'test-workspace';

      store.dispatch(actionCreators.setWorkspaceQualifiedName(namespace, workspaceName));

      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual(qualifiedNameSetAction({ namespace, workspaceName }));
    });
  });

  describe('clearWorkspaceQualifiedName', () => {
    it('should dispatch clearWorkspaceQualifiedName action', () => {
      store.dispatch(actionCreators.clearWorkspaceQualifiedName());

      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual(qualifiedNameClearAction());
    });
  });

  describe('setWorkspaceUID', () => {
    it('should dispatch setWorkspaceUID action', () => {
      const workspaceUID = 'test-uid';

      store.dispatch(actionCreators.setWorkspaceUID(workspaceUID));

      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual(workspaceUIDSetAction(workspaceUID));
    });
  });

  describe('clearWorkspaceUID', () => {
    it('should dispatch clearWorkspaceUID action', () => {
      store.dispatch(actionCreators.clearWorkspaceUID());

      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual(workspaceUIDClearAction());
    });
  });
});
