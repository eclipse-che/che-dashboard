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

import { UnknownAction } from 'redux';

import devfileApi from '@/services/devfileApi';
import { DevWorkspaceStatus } from '@/services/helpers/types';
import * as actions from '@/store/Workspaces/devWorkspaces/actions/actions';
import { reducer, State, unloadedState } from '@/store/Workspaces/devWorkspaces/reducer';

describe('devWorkspaces reducer', () => {
  let initialState: State;

  beforeEach(() => {
    initialState = { ...unloadedState };
  });

  it('should handle devWorkspacesRequestAction', () => {
    const action = actions.devWorkspacesRequestAction();
    const expectedState: State = {
      ...initialState,
      isLoading: true,
      error: undefined,
    };

    const newState = reducer(initialState, action);

    expect(newState).toEqual(expectedState);
  });

  it('should handle devWorkspacesReceiveAction', () => {
    const workspaces = [
      { metadata: { uid: '1', resourceVersion: '1' } },
    ] as devfileApi.DevWorkspace[];
    const action = actions.devWorkspacesReceiveAction({
      workspaces,
      resourceVersion: '1',
    });
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      workspaces,
      resourceVersion: '1',
    };

    const newState = reducer(initialState, action);

    expect(newState).toEqual(expectedState);
  });

  it('should handle devWorkspacesErrorAction', () => {
    const errorMessage = 'An error occurred';
    const action = actions.devWorkspacesErrorAction(errorMessage);
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      error: errorMessage,
    };

    const newState = reducer(initialState, action);

    expect(newState).toEqual(expectedState);
  });

  it('should handle devWorkspacesUpdateAction with undefined payload', () => {
    const action = actions.devWorkspacesUpdateAction(undefined);
    const expectedState: State = {
      ...initialState,
      isLoading: false,
    };

    const newState = reducer(initialState, action);

    expect(newState).toEqual(expectedState);
  });

  it('should handle devWorkspacesUpdateAction with valid payload', () => {
    const existingWorkspace = {
      metadata: { uid: '1', resourceVersion: '1' },
    } as devfileApi.DevWorkspace;
    const updatedWorkspace = {
      metadata: { uid: '1', resourceVersion: '2' },
    } as devfileApi.DevWorkspace;
    const initialStateWithWorkspaces = {
      ...initialState,
      workspaces: [existingWorkspace],
    };
    const action = actions.devWorkspacesUpdateAction(updatedWorkspace);
    const expectedState: State = {
      ...initialStateWithWorkspaces,
      isLoading: false,
      workspaces: [updatedWorkspace],
      resourceVersion: '2',
    };

    const newState = reducer(initialStateWithWorkspaces, action);

    expect(newState).toEqual(expectedState);
  });

  it('should handle devWorkspacesAddAction', () => {
    const workspace = { metadata: { uid: '1', resourceVersion: '1' } } as devfileApi.DevWorkspace;
    const action = actions.devWorkspacesAddAction(workspace);
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      workspaces: [workspace],
      resourceVersion: '1',
    };

    const newState = reducer(initialState, action);

    expect(newState).toEqual(expectedState);
  });

  it('should handle devWorkspacesTerminateAction', () => {
    const workspace = {
      metadata: { uid: '1', resourceVersion: '1' },
      status: {
        phase: DevWorkspaceStatus.RUNNING,
        message: '',
      },
    } as devfileApi.DevWorkspace;
    const initialStateWithWorkspaces = {
      ...initialState,
      workspaces: [workspace],
    };
    const action = actions.devWorkspacesTerminateAction({
      workspaceUID: '1',
      message: 'Terminating workspace',
    });
    const expectedWorkspace = {
      ...workspace,
      status: {
        phase: DevWorkspaceStatus.TERMINATING,
        message: 'Terminating workspace',
      },
    } as devfileApi.DevWorkspace;
    const expectedState: State = {
      ...initialStateWithWorkspaces,
      isLoading: false,
      workspaces: [expectedWorkspace],
    };

    const newState = reducer(initialStateWithWorkspaces, action);

    expect(newState).toEqual(expectedState);
  });

  it('should handle devWorkspacesDeleteAction', () => {
    const workspaceToDelete = {
      metadata: { uid: '1', resourceVersion: '1' },
    } as devfileApi.DevWorkspace;
    const workspaceToKeep = {
      metadata: { uid: '2', resourceVersion: '1' },
    } as devfileApi.DevWorkspace;
    const initialStateWithWorkspaces = {
      ...initialState,
      workspaces: [workspaceToDelete, workspaceToKeep],
    };
    const action = actions.devWorkspacesDeleteAction(workspaceToDelete);
    const expectedState: State = {
      ...initialStateWithWorkspaces,
      isLoading: false,
      workspaces: [workspaceToKeep],
      resourceVersion: '1',
    };

    const newState = reducer(initialStateWithWorkspaces, action);

    expect(newState).toEqual(expectedState);
  });

  it('should handle devWorkspacesUpdateStartedAction', () => {
    const workspace = {
      metadata: { uid: '1', resourceVersion: '1' },
      spec: { started: true },
    } as devfileApi.DevWorkspace;
    const action = actions.devWorkspacesUpdateStartedAction([workspace]);
    const expectedState: State = {
      ...initialState,
      startedWorkspaces: {
        '1': '1',
      },
    };

    const newState = reducer(initialState, action);

    expect(newState).toEqual(expectedState);
  });

  it('should handle devWorkspaceWarningUpdateAction', () => {
    const workspace = { metadata: { uid: '1' } } as devfileApi.DevWorkspace;
    const action = actions.devWorkspaceWarningUpdateAction({
      workspace,
      warning: 'This is a warning',
    });
    const expectedState: State = {
      ...initialState,
      warnings: {
        '1': 'This is a warning',
      },
    };

    const newState = reducer(initialState, action);

    expect(newState).toEqual(expectedState);
  });

  it('should return the current state for unknown actions', () => {
    const unknownAction = { type: 'UNKNOWN_ACTION' } as UnknownAction;
    const newState = reducer(initialState, unknownAction);

    expect(newState).toEqual(initialState);
  });
});
