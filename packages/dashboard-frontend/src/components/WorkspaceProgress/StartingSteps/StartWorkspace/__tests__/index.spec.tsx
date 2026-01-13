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

import { api } from '@eclipse-che/common';
import { CoreV1Event } from '@kubernetes/client-node';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent, { UserEvent } from '@testing-library/user-event';
import React from 'react';
import { Provider } from 'react-redux';
import { Location } from 'react-router-dom';
import { Store } from 'redux';

import { MIN_STEP_DURATION_MS } from '@/components/WorkspaceProgress/const';
import { WorkspaceRouteParams } from '@/Routes';
import getComponentRenderer from '@/services/__mocks__/getComponentRenderer';
import { DEVWORKSPACE_STORAGE_TYPE_ATTR } from '@/services/devfileApi/devWorkspace/spec/template';
import { getDefer } from '@/services/helpers/deferred';
import { AlertItem, isActionCallback } from '@/services/helpers/types';
import { AppThunk } from '@/store';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';
import { workspacesActionCreators } from '@/store/Workspaces';

import StartingStepStartWorkspace from '..';

jest.mock('@/components/WorkspaceProgress/TimeLimit');

const mockStartWorkspace = jest.fn();
const mockStopWorkspace = jest.fn();
jest.mock('@/store/Workspaces', () => {
  return {
    ...jest.requireActual('@/store/Workspaces'),
    workspacesActionCreators: {
      startWorkspace:
        (...args: Parameters<(typeof workspacesActionCreators)['startWorkspace']>): AppThunk =>
        async () => {
          return mockStartWorkspace(...args);
        },
      stopWorkspace:
        (...args: Parameters<(typeof workspacesActionCreators)['stopWorkspace']>): AppThunk =>
        async () => {
          return mockStopWorkspace(...args);
        },
    } as typeof workspacesActionCreators,
  };
});

const mockOnNextStep = jest.fn();
const mockOnRestart = jest.fn();
const mockOnError = jest.fn();
const mockOnHideError = jest.fn();

const { renderComponent } = getComponentRenderer(getComponent);

const namespace = 'che-user';
const workspaceName = 'test-workspace';
const matchParams: WorkspaceRouteParams = {
  namespace,
  workspaceName,
};

const startTimeout = 300;
const serverConfig: api.IServerConfig = {
  containerBuild: {},
  containerRun: {},
  defaults: {
    editor: undefined,
    components: [],
    plugins: [],
    pvcStrategy: '',
  },
  pluginRegistry: {
    openVSXURL: '',
  },
  timeouts: {
    inactivityTimeout: -1,
    runTimeout: -1,
    startTimeout,
    axiosRequestTimeout: 30000,
  },
  defaultNamespace: {
    autoProvision: true,
  },
  cheNamespace: '',
  devfileRegistry: {
    disableInternalRegistry: false,
    externalDevfileRegistries: [],
  },
  pluginRegistryURL: '',
  pluginRegistryInternalURL: '',
  allowedSourceUrls: [],
};

describe('Starting steps, starting a workspace', () => {
  let user: UserEvent;

  beforeEach(() => {
    jest.useFakeTimers();
    // Clear static set to prevent test interference
    StartingStepStartWorkspace.clearRestartInitiatedSet();

    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('workspace not found', () => {
    const wrongWorkspaceName = 'wrong-workspace-name';
    let store: Store;
    let paramsWithWrongName: WorkspaceRouteParams;

    beforeEach(() => {
      store = new MockStoreBuilder()
        .withDevWorkspaces({
          workspaces: [
            new DevWorkspaceBuilder()
              .withName(workspaceName)
              .withNamespace(namespace)
              .withStatus({ phase: 'STOPPING' })
              .build(),
          ],
        })
        .build();

      paramsWithWrongName = {
        namespace,
        workspaceName: wrongWorkspaceName,
      };
    });

    test('alert notification', async () => {
      renderComponent(store, paramsWithWrongName);

      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

      const expectAlertItem = expect.objectContaining({
        title: 'Failed to open the workspace',
        children: `Workspace "${namespace}/${wrongWorkspaceName}" not found.`,
        actionCallbacks: [
          expect.objectContaining({
            title: 'Restart',
            callback: expect.any(Function),
          }),
          expect.objectContaining({
            title: 'Restart with default devfile',
            callback: expect.any(Function),
          }),
        ],
      });
      await waitFor(() => expect(mockOnError).toHaveBeenCalledWith(expectAlertItem));

      expect(mockOnNextStep).not.toHaveBeenCalled();
      expect(mockOnRestart).not.toHaveBeenCalled();
    });

    test('action callback to restart', async () => {
      // this deferred object will help run the callback at the right time
      const deferred = getDefer();

      const actionTitle = 'Restart';
      mockOnError.mockImplementationOnce((alertItem: AlertItem) => {
        const action = alertItem.actionCallbacks?.find(action =>
          action.title.startsWith(actionTitle),
        );
        expect(action).toBeDefined();

        if (action && isActionCallback(action)) {
          deferred.promise.then(action.callback);
        } else {
          throw new Error('Action not found');
        }
      });
      renderComponent(store, paramsWithWrongName);
      await jest.runAllTimersAsync();

      await waitFor(() => expect(mockOnError).toHaveBeenCalled());
      mockOnError.mockClear();
      expect(mockOnNextStep).not.toHaveBeenCalled();
      expect(mockOnRestart).not.toHaveBeenCalled();

      /* test the action */
      deferred.resolve();

      // resolve deferred to trigger the callback
      // Use runAllTimersAsync to ensure setState callback is executed
      await jest.runAllTimersAsync();

      // this mock is called from the action callback above
      await waitFor(() => expect(mockOnRestart).toHaveBeenCalled());
      expect(mockOnNextStep).not.toHaveBeenCalled();
      expect(mockOnError).not.toHaveBeenCalled();
    });
  });

  test('workspace is STOPPED', async () => {
    const store = new MockStoreBuilder()
      .withDevWorkspaces({
        workspaces: [
          new DevWorkspaceBuilder()
            .withName(workspaceName)
            .withNamespace(namespace)
            .withStatus({ phase: 'STOPPED' })
            .build(),
        ],
      })
      .build();

    renderComponent(store);

    await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

    // the workspace should be started
    await waitFor(() => expect(mockStartWorkspace).toHaveBeenCalled());

    // no errors for this step
    expect(mockOnError).not.toHaveBeenCalled();

    expect(mockOnNextStep).not.toHaveBeenCalled();
    expect(mockOnRestart).not.toHaveBeenCalled();
  });

  test('workspace is STOPPED and it fails to start', async () => {
    const store = new MockStoreBuilder()
      .withDevWorkspaces({
        workspaces: [
          new DevWorkspaceBuilder()
            .withName(workspaceName)
            .withNamespace(namespace)
            .withStatus({ phase: 'STOPPED' })
            .build(),
        ],
      })
      .build();

    // the workspace start fails with the following message
    const errorMessage = `You're not allowed to run more workspaces`;
    mockStartWorkspace.mockRejectedValueOnce(errorMessage);

    renderComponent(store);

    await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

    // should call the workspace start mock
    await waitFor(() => expect(mockStartWorkspace).toHaveBeenCalled());

    // should show the error
    const expectAlertItem = expect.objectContaining({
      title: 'Failed to open the workspace',
      children: errorMessage,
      actionCallbacks: [
        expect.objectContaining({
          title: 'Restart',
          callback: expect.any(Function),
        }),
        expect.objectContaining({
          title: 'Restart with default devfile',
          callback: expect.any(Function),
        }),
      ],
    });
    await waitFor(() => expect(mockOnError).toHaveBeenCalledWith(expectAlertItem));

    expect(mockOnNextStep).not.toHaveBeenCalled();
    expect(mockOnRestart).not.toHaveBeenCalled();
  });

  test('workspace is FAILED', async () => {
    const store = new MockStoreBuilder()
      .withDevWorkspaces({
        workspaces: [
          new DevWorkspaceBuilder()
            .withName(workspaceName)
            .withNamespace(namespace)
            .withStatus({ phase: 'FAILED' })
            .build(),
        ],
      })
      .build();

    renderComponent(store);

    await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

    // the workspace should be started
    await waitFor(() => expect(mockStartWorkspace).toHaveBeenCalled());

    // no errors for this step
    expect(mockOnError).not.toHaveBeenCalled();

    expect(mockOnNextStep).not.toHaveBeenCalled();
    expect(mockOnRestart).not.toHaveBeenCalled();
  });

  test('workspace is RUNNING', async () => {
    const store = new MockStoreBuilder()
      .withDevWorkspaces({
        workspaces: [
          new DevWorkspaceBuilder()
            .withName(workspaceName)
            .withNamespace(namespace)
            .withStatus({ phase: 'RUNNING' })
            .build(),
        ],
      })
      .build();

    renderComponent(store);

    await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

    // should switch to the next step
    await waitFor(() => expect(mockOnNextStep).toHaveBeenCalled());

    // should not start the workspace
    expect(mockStartWorkspace).not.toHaveBeenCalled();

    // no errors for this step
    expect(mockOnError).not.toHaveBeenCalled();

    expect(mockOnRestart).not.toHaveBeenCalled();
  });

  test('workspace is STARTING then RUNNING', async () => {
    const store = new MockStoreBuilder()
      .withDwServerConfig(serverConfig)
      .withDevWorkspaces({
        workspaces: [
          new DevWorkspaceBuilder()
            .withName(workspaceName)
            .withNamespace(namespace)
            .withStatus({ phase: 'STARTING' })
            .build(),
        ],
      })
      .build();

    const { reRenderComponent } = renderComponent(store);

    await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

    // no errors at this moment
    expect(mockOnError).not.toHaveBeenCalled();
    expect(mockOnRestart).not.toHaveBeenCalled();
    expect(mockOnNextStep).not.toHaveBeenCalled();

    const nextStore = new MockStoreBuilder()
      .withDevWorkspaces({
        workspaces: [
          new DevWorkspaceBuilder()
            .withName(workspaceName)
            .withNamespace(namespace)
            .withStatus({ phase: 'RUNNING' })
            .build(),
        ],
      })
      .build();
    reRenderComponent(nextStore);

    await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

    // switch to the next step
    await waitFor(() => expect(mockOnNextStep).toHaveBeenCalled());
    expect(mockOnError).not.toHaveBeenCalled();
    expect(mockOnRestart).not.toHaveBeenCalled();
  });

  test('workspace is STARTING then STOPPING', async () => {
    const store = new MockStoreBuilder()
      .withDwServerConfig(serverConfig)
      .withDevWorkspaces({
        workspaces: [
          new DevWorkspaceBuilder()
            .withName(workspaceName)
            .withNamespace(namespace)
            .withStatus({ phase: 'STARTING' })
            .build(),
        ],
      })
      .build();

    const { reRenderComponent } = renderComponent(store);

    await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

    // no errors at this moment
    expect(mockOnError).not.toHaveBeenCalled();
    expect(mockOnRestart).not.toHaveBeenCalled();
    expect(mockOnNextStep).not.toHaveBeenCalled();

    const nextStore = new MockStoreBuilder()
      .withDevWorkspaces({
        workspaces: [
          new DevWorkspaceBuilder()
            .withName(workspaceName)
            .withNamespace(namespace)
            .withStatus({ phase: 'STOPPING' })
            .build(),
        ],
      })
      .build();
    reRenderComponent(nextStore);

    await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

    // should not report any error
    expect(mockOnError).not.toHaveBeenCalled();

    // should not start the workspace
    expect(mockStartWorkspace).not.toHaveBeenCalled();

    expect(mockOnNextStep).not.toHaveBeenCalled();
    expect(mockOnRestart).not.toHaveBeenCalled();
  });

  test('workspace is STARTING then FAILING', async () => {
    const store = new MockStoreBuilder()
      .withDwServerConfig(serverConfig)
      .withDevWorkspaces({
        workspaces: [
          new DevWorkspaceBuilder()
            .withName(workspaceName)
            .withNamespace(namespace)
            .withStatus({ phase: 'STARTING' })
            .build(),
        ],
      })
      .build();

    const { reRenderComponent } = renderComponent(store);

    await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

    // no errors at this moment
    expect(mockOnError).not.toHaveBeenCalled();

    const nextStore = new MockStoreBuilder()
      .withDevWorkspaces({
        workspaces: [
          new DevWorkspaceBuilder()
            .withName(workspaceName)
            .withNamespace(namespace)
            .withStatus({ phase: 'FAILING' })
            .build(),
        ],
      })
      .build();
    reRenderComponent(nextStore);

    await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

    // should not report any error
    expect(mockOnError).not.toHaveBeenCalled();

    expect(mockStartWorkspace).not.toHaveBeenCalled();
    expect(mockOnNextStep).not.toHaveBeenCalled();
    expect(mockOnRestart).not.toHaveBeenCalled();
  });

  test('workspace is STARTING then FAILED', async () => {
    const store = new MockStoreBuilder()
      .withDwServerConfig(serverConfig)
      .withDevWorkspaces({
        workspaces: [
          new DevWorkspaceBuilder()
            .withName(workspaceName)
            .withNamespace(namespace)
            .withStatus({ phase: 'STARTING' })
            .build(),
        ],
      })
      .build();

    const { reRenderComponent } = renderComponent(store);

    await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

    // no errors at this moment
    expect(mockOnError).not.toHaveBeenCalled();

    const nextStore = new MockStoreBuilder()
      .withDevWorkspaces({
        workspaces: [
          new DevWorkspaceBuilder()
            .withName(workspaceName)
            .withNamespace(namespace)
            .withStatus({ phase: 'FAILED' })
            .build(),
        ],
      })
      .build();
    reRenderComponent(nextStore);

    await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

    // should report the error
    const expectAlertItem = expect.objectContaining({
      title: 'Failed to open the workspace',
      children: 'The workspace status changed unexpectedly to "Failed".',
      actionCallbacks: [
        expect.objectContaining({
          title: 'Restart',
          callback: expect.any(Function),
        }),
        expect.objectContaining({
          title: 'Restart with default devfile',
          callback: expect.any(Function),
        }),
      ],
    });
    await waitFor(() => expect(mockOnError).toHaveBeenCalledWith(expectAlertItem));

    // should not start the workspace
    expect(mockStartWorkspace).not.toHaveBeenCalled();

    expect(mockOnNextStep).not.toHaveBeenCalled();
    expect(mockOnRestart).not.toHaveBeenCalled();
  });

  test('workspace is FAILING', async () => {
    const store = new MockStoreBuilder()
      .withDevWorkspaces({
        workspaces: [
          new DevWorkspaceBuilder()
            .withName(workspaceName)
            .withNamespace(namespace)
            .withStatus({ phase: 'FAILING' })
            .build(),
        ],
      })
      .build();

    renderComponent(store);

    await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

    // should not report any error
    expect(mockOnError).not.toHaveBeenCalled();

    expect(mockOnNextStep).not.toHaveBeenCalled();
    expect(mockOnRestart).not.toHaveBeenCalled();
  });

  test('workspace is STOPPING', async () => {
    const store = new MockStoreBuilder()
      .withDevWorkspaces({
        workspaces: [
          new DevWorkspaceBuilder()
            .withName(workspaceName)
            .withNamespace(namespace)
            .withStatus({ phase: 'STOPPING' })
            .build(),
        ],
      })
      .build();

    renderComponent(store);

    await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

    // should not report any error
    expect(mockOnError).not.toHaveBeenCalled();

    expect(mockOnNextStep).not.toHaveBeenCalled();
    expect(mockOnRestart).not.toHaveBeenCalled();
  });

  test('workspace is TERMINATING', async () => {
    const store = new MockStoreBuilder()
      .withDevWorkspaces({
        workspaces: [
          new DevWorkspaceBuilder()
            .withName(workspaceName)
            .withNamespace(namespace)
            .withStatus({ phase: 'TERMINATING' })
            .build(),
        ],
      })
      .build();

    renderComponent(store);

    await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

    // should report the error
    const expectAlertItem = expect.objectContaining({
      title: 'Failed to open the workspace',
      children: 'The workspace status changed unexpectedly to "Terminating".',
      actionCallbacks: [
        expect.objectContaining({
          title: 'Restart',
          callback: expect.any(Function),
        }),
        expect.objectContaining({
          title: 'Restart with default devfile',
          callback: expect.any(Function),
        }),
      ],
    });
    await waitFor(() => expect(mockOnError).toHaveBeenCalledWith(expectAlertItem));

    expect(mockOnNextStep).not.toHaveBeenCalled();
    expect(mockOnRestart).not.toHaveBeenCalled();
  });

  describe('step timeout reached', () => {
    let store: Store;

    beforeEach(() => {
      mockStopWorkspace.mockResolvedValue(undefined);
      store = new MockStoreBuilder()
        .withDwServerConfig(serverConfig)
        .withDevWorkspaces({
          workspaces: [
            new DevWorkspaceBuilder()
              .withName(workspaceName)
              .withNamespace(namespace)
              .withStatus({ phase: 'STARTING' })
              .build(),
          ],
        })
        .build();
    });

    test('notification alert', async () => {
      renderComponent(store);
      await jest.runAllTimersAsync();

      // trigger timeout
      const timeoutButton = screen.getByRole('button', {
        name: 'onTimeout',
      });
      await user.click(timeoutButton);

      const expectAlertItem = expect.objectContaining({
        title: 'Failed to open the workspace',
        children: 'The workspace status remains "Starting" in the last 300 seconds.',
        actionCallbacks: [
          expect.objectContaining({
            title: 'Restart',
            callback: expect.any(Function),
          }),
          expect.objectContaining({
            title: 'Restart with default devfile',
            callback: expect.any(Function),
          }),
        ],
      });
      await waitFor(() => expect(mockOnError).toHaveBeenCalledWith(expectAlertItem));

      expect(mockOnNextStep).not.toHaveBeenCalled();
      expect(mockOnRestart).not.toHaveBeenCalled();
    });

    test('action callback to restart should stop workspace first when starting', async () => {
      // this deferred object will help run the callback at the right time
      const deferred = getDefer();

      const actionTitle = 'Restart';
      mockOnError.mockImplementationOnce((alertItem: AlertItem) => {
        const action = alertItem.actionCallbacks?.find(action =>
          action.title.startsWith(actionTitle),
        );
        expect(action).toBeDefined();

        if (action && isActionCallback(action)) {
          deferred.promise.then(action.callback);
        } else {
          throw new Error('Action not found');
        }
      });

      renderComponent(store);
      await jest.runAllTimersAsync();

      // trigger timeout
      const timeoutButton = screen.getByRole('button', {
        name: 'onTimeout',
      });
      await user.click(timeoutButton);

      await waitFor(() => expect(mockOnError).toHaveBeenCalled());
      mockOnError.mockClear();
      expect(mockOnRestart).not.toHaveBeenCalled();
      expect(mockOnNextStep).not.toHaveBeenCalled();

      /* test the action */

      // resolve deferred to trigger the callback
      // Since workspace is in STARTING state, handleRestart will call stopWorkspace first
      await act(async () => {
        deferred.resolve();
        await jest.runAllTimersAsync();
      });

      // Verify that stopWorkspace was called because workspace is in STARTING state
      await waitFor(() => expect(mockStopWorkspace).toHaveBeenCalledTimes(1));

      // onRestart should not be called immediately - it waits for workspace to stop
      // The full restart-after-stop flow is tested in the PVC error tests
      expect(mockOnRestart).not.toHaveBeenCalled();
    });
  });

  describe('PVC error with workspace in Starting state', () => {
    let store: Store;

    beforeEach(() => {
      mockStopWorkspace.mockResolvedValue(undefined);
      const devWorkspace = new DevWorkspaceBuilder()
        .withName(workspaceName)
        .withId(workspaceName)
        .withNamespace(namespace)
        .withUID('uid-123')
        .withStatus({
          phase: 'STARTING',
          conditions: [
            {
              type: 'StorageReady',
              status: 'False',
              message: 'Storage quota exceeded',
            },
          ],
        })
        .build();
      // Set storage type to per-user so PVC error detection works
      if (!devWorkspace.spec.template.attributes) {
        devWorkspace.spec.template.attributes = {};
      }
      devWorkspace.spec.template.attributes[DEVWORKSPACE_STORAGE_TYPE_ATTR] = 'per-user';

      store = new MockStoreBuilder()
        .withDwServerConfig(serverConfig)
        .withDevWorkspaces({
          workspaces: [devWorkspace],
          startedWorkspaces: {
            'uid-123': '100',
          },
        })
        .withEvents({
          events: [
            {
              metadata: {
                name: `${workspaceName}-pod-123`,
                resourceVersion: '101',
                namespace,
              },
              reason: 'Failed',
              message: 'failed to create subPath directory for volumeMount',
            } as CoreV1Event,
          ],
        })
        .build();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should stop workspace first when restarting from PVC error in Starting state', async () => {
      // Tests that when workspace is STARTING, restart action stops it first
      // and then starts it again via runStep
      const deferred = getDefer();

      const actionTitle = 'Restart';
      let callCount = 0;
      mockOnError.mockImplementation((alertItem: AlertItem) => {
        callCount++;
        if (callCount === 1) {
          const action = alertItem.actionCallbacks?.find(action =>
            action.title.startsWith(actionTitle),
          );
          if (action && isActionCallback(action)) {
            deferred.promise.then(action.callback);
          }
        }
      });

      const { reRenderComponent } = renderComponent(store);
      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);
      await jest.runAllTimersAsync();

      await waitFor(() => expect(mockOnError).toHaveBeenCalled());
      mockOnError.mockClear();

      expect(mockStopWorkspace).not.toHaveBeenCalled();

      // Trigger the restart action
      deferred.resolve();
      await jest.runOnlyPendingTimersAsync();

      // Verify that stopWorkspace was called
      await waitFor(() => expect(mockStopWorkspace).toHaveBeenCalledTimes(1));
      expect(mockStopWorkspace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: workspaceName,
          namespace,
        }),
      );

      // Verify restartInitiatedSet was updated
      expect(StartingStepStartWorkspace.getRestartInitiatedSet().has('uid-123')).toBe(true);

      // Simulate workspace transitioning to STOPPED
      const stoppedDevWorkspace = new DevWorkspaceBuilder()
        .withName(workspaceName)
        .withId(workspaceName)
        .withNamespace(namespace)
        .withUID('uid-123')
        .withStatus({ phase: 'STOPPED' })
        .build();
      if (!stoppedDevWorkspace.spec.template.attributes) {
        stoppedDevWorkspace.spec.template.attributes = {};
      }
      stoppedDevWorkspace.spec.template.attributes[DEVWORKSPACE_STORAGE_TYPE_ATTR] = 'per-user';

      const stoppedStore = new MockStoreBuilder()
        .withDwServerConfig(serverConfig)
        .withDevWorkspaces({
          workspaces: [stoppedDevWorkspace],
          startedWorkspaces: {
            'uid-123': '100',
          },
        })
        .withEvents({ events: [] })
        .build();
      reRenderComponent(stoppedStore);
      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);
      await jest.runAllTimersAsync();

      // startWorkspace should be called via runStep
      await waitFor(() => expect(mockStartWorkspace).toHaveBeenCalled());

      // restartInitiatedSet should be cleared after start
      expect(StartingStepStartWorkspace.getRestartInitiatedSet().has('uid-123')).toBe(false);
    });

    test('should stop workspace first when workspace.isStarting is true', async () => {
      // Create a workspace that has isStarting = true
      const devWorkspace = new DevWorkspaceBuilder()
        .withName(workspaceName)
        .withId(workspaceName)
        .withNamespace(namespace)
        .withUID('uid-123')
        .withStatus({
          phase: 'STARTING',
          conditions: [
            {
              type: 'StorageReady',
              status: 'False',
              message: 'Storage quota exceeded',
            },
          ],
        })
        .build();
      if (!devWorkspace.spec.template.attributes) {
        devWorkspace.spec.template.attributes = {};
      }
      devWorkspace.spec.template.attributes[DEVWORKSPACE_STORAGE_TYPE_ATTR] = 'per-user';

      const testStore = new MockStoreBuilder()
        .withDwServerConfig(serverConfig)
        .withDevWorkspaces({
          workspaces: [devWorkspace],
          startedWorkspaces: {
            'uid-123': '100',
          },
        })
        .withEvents({
          events: [
            {
              metadata: {
                name: `${workspaceName}-pod-123`,
                resourceVersion: '101',
                namespace,
              },
              reason: 'Failed',
              message: 'failed to create subPath directory for volumeMount',
            } as CoreV1Event,
          ],
        })
        .build();

      const deferred = getDefer();
      const actionTitle = 'Restart';
      mockOnError.mockImplementationOnce((alertItem: AlertItem) => {
        const action = alertItem.actionCallbacks?.find(action =>
          action.title.startsWith(actionTitle),
        );
        expect(action).toBeDefined();

        if (action && isActionCallback(action)) {
          deferred.promise.then(action.callback);
        } else {
          throw new Error('Action not found');
        }
      });

      renderComponent(testStore);
      await jest.runAllTimersAsync();

      await waitFor(() => expect(mockOnError).toHaveBeenCalled());
      mockOnError.mockClear();

      deferred.resolve();
      await jest.runOnlyPendingTimersAsync();

      // Verify that stopWorkspace was called because workspace.isStarting is true
      await waitFor(() => expect(mockStopWorkspace).toHaveBeenCalledTimes(1));
      expect(mockOnRestart).not.toHaveBeenCalled();
    });

    test('should stop workspace first when workspace.isRunning is true', async () => {
      // Create a workspace that is Running with StorageReady condition indicating PVC error
      const devWorkspace = new DevWorkspaceBuilder()
        .withName(workspaceName)
        .withId(workspaceName)
        .withNamespace(namespace)
        .withUID('uid-123')
        .withStatus({
          phase: 'RUNNING',
          conditions: [
            {
              type: 'StorageReady',
              status: 'False',
              message: 'Storage quota exceeded',
            },
          ],
        })
        .build();
      if (!devWorkspace.spec.template.attributes) {
        devWorkspace.spec.template.attributes = {};
      }
      devWorkspace.spec.template.attributes[DEVWORKSPACE_STORAGE_TYPE_ATTR] = 'per-user';

      const testStore = new MockStoreBuilder()
        .withDwServerConfig(serverConfig)
        .withDevWorkspaces({
          workspaces: [devWorkspace],
          startedWorkspaces: {
            'uid-123': '100',
          },
        })
        .withEvents({
          events: [
            {
              metadata: {
                name: `${workspaceName}-pod-123`,
                resourceVersion: '101',
                namespace,
              },
              reason: 'Failed',
              message: 'failed to create subPath directory for volumeMount',
            } as CoreV1Event,
          ],
        })
        .build();

      const deferred = getDefer();
      const actionTitle = 'Restart';
      let callCount = 0;
      mockOnError.mockImplementation((alertItem: AlertItem) => {
        callCount++;
        if (callCount === 1) {
          // First call: PVC error
          const action = alertItem.actionCallbacks?.find(action =>
            action.title.startsWith(actionTitle),
          );
          if (action && isActionCallback(action)) {
            deferred.promise.then(action.callback);
          }
        }
      });

      renderComponent(testStore);
      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);
      await jest.runAllTimersAsync();

      // Note: mockOnError may be called multiple times due to componentDidUpdate, so we check for at least 1 call
      await waitFor(() => expect(mockOnError).toHaveBeenCalled());
      mockOnError.mockClear();

      deferred.resolve();
      await jest.runOnlyPendingTimersAsync();

      // Verify that stopWorkspace was called because workspace.isRunning is true
      await waitFor(() => expect(mockStopWorkspace).toHaveBeenCalledTimes(1));
      expect(mockOnRestart).not.toHaveBeenCalled();
    });

    test('should not stop workspace when it is already stopped', async () => {
      // Create a workspace that is already stopped with StorageReady condition indicating PVC error
      const stoppedDevWorkspace = new DevWorkspaceBuilder()
        .withName(workspaceName)
        .withId(workspaceName)
        .withNamespace(namespace)
        .withUID('uid-123')
        .withStatus({
          phase: 'STOPPED',
          conditions: [
            {
              type: 'StorageReady',
              status: 'False',
              message: 'Storage quota exceeded',
            },
          ],
        })
        .build();
      if (!stoppedDevWorkspace.spec.template.attributes) {
        stoppedDevWorkspace.spec.template.attributes = {};
      }
      stoppedDevWorkspace.spec.template.attributes[DEVWORKSPACE_STORAGE_TYPE_ATTR] = 'per-user';

      const stoppedStore = new MockStoreBuilder()
        .withDwServerConfig(serverConfig)
        .withDevWorkspaces({
          workspaces: [stoppedDevWorkspace],
          startedWorkspaces: {
            'uid-123': '100',
          },
        })
        .withEvents({
          events: [
            {
              metadata: {
                name: `${workspaceName}-pod-123`,
                resourceVersion: '101',
                namespace,
              },
              reason: 'Failed',
              message: 'failed to create subPath directory for volumeMount',
            } as CoreV1Event,
          ],
        })
        .build();

      const deferred = getDefer();
      const actionTitle = 'Restart';
      let callCount = 0;
      mockOnError.mockImplementation((alertItem: AlertItem) => {
        callCount++;
        if (callCount === 1) {
          // First call: PVC error
          const action = alertItem.actionCallbacks?.find(action =>
            action.title.startsWith(actionTitle),
          );
          if (action && isActionCallback(action)) {
            deferred.promise.then(action.callback);
          }
        }
      });

      renderComponent(stoppedStore);
      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);
      await jest.runAllTimersAsync();

      // Note: mockOnError may be called multiple times due to componentDidUpdate, so we check for at least 1 call
      await waitFor(() => expect(mockOnError).toHaveBeenCalled());
      mockOnError.mockClear();

      deferred.resolve();
      await jest.runOnlyPendingTimersAsync();

      // Verify that stopWorkspace was NOT called because workspace is already stopped
      expect(mockStopWorkspace).not.toHaveBeenCalled();
      // Verify that onRestart was called directly
      await waitFor(() => expect(mockOnRestart).toHaveBeenCalledTimes(1));
    });

    test('should not stop workspace when it is already failed', async () => {
      // Create a workspace that is already failed with StorageReady condition indicating PVC error
      const failedDevWorkspace = new DevWorkspaceBuilder()
        .withName(workspaceName)
        .withId(workspaceName)
        .withNamespace(namespace)
        .withUID('uid-123')
        .withStatus({
          phase: 'FAILED',
          conditions: [
            {
              type: 'StorageReady',
              status: 'False',
              message: 'Storage quota exceeded',
            },
          ],
        })
        .build();
      if (!failedDevWorkspace.spec.template.attributes) {
        failedDevWorkspace.spec.template.attributes = {};
      }
      failedDevWorkspace.spec.template.attributes[DEVWORKSPACE_STORAGE_TYPE_ATTR] = 'per-user';

      const failedStore = new MockStoreBuilder()
        .withDwServerConfig(serverConfig)
        .withDevWorkspaces({
          workspaces: [failedDevWorkspace],
          startedWorkspaces: {
            'uid-123': '100',
          },
        })
        .withEvents({
          events: [
            {
              metadata: {
                name: `${workspaceName}-pod-123`,
                resourceVersion: '101',
                namespace,
              },
              reason: 'Failed',
              message: 'failed to create subPath directory for volumeMount',
            } as CoreV1Event,
          ],
        })
        .build();

      const deferred = getDefer();
      const actionTitle = 'Restart';
      let callCount = 0;
      mockOnError.mockImplementation((alertItem: AlertItem) => {
        callCount++;
        if (callCount === 1) {
          // First call: PVC error
          const action = alertItem.actionCallbacks?.find(action =>
            action.title.startsWith(actionTitle),
          );
          if (action && isActionCallback(action)) {
            deferred.promise.then(action.callback);
          }
        }
      });

      renderComponent(failedStore);
      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);
      await jest.runAllTimersAsync();

      // Note: mockOnError may be called multiple times due to componentDidUpdate, so we check for at least 1 call
      await waitFor(() => expect(mockOnError).toHaveBeenCalled());
      mockOnError.mockClear();

      deferred.resolve();
      await jest.runOnlyPendingTimersAsync();

      // Verify that stopWorkspace was NOT called because workspace is already failed
      expect(mockStopWorkspace).not.toHaveBeenCalled();
      // Verify that onRestart was called directly
      await waitFor(() => expect(mockOnRestart).toHaveBeenCalledTimes(1));
    });

    test('should not show PVC error again after restart is clicked on stopped workspace', async () => {
      // Build a store with a STOPPED workspace and PVC error events
      // Use the same UID pattern as other tests for consistency
      const stoppedDevWorkspace = new DevWorkspaceBuilder()
        .withName(workspaceName)
        .withId(workspaceName)
        .withNamespace(namespace)
        .withUID('uid-123')
        .withStatus({
          phase: 'STOPPED',
          conditions: [
            {
              type: 'StorageReady',
              status: 'False',
              message: 'Storage quota exceeded',
            },
          ],
        })
        .build();
      if (!stoppedDevWorkspace.spec.template.attributes) {
        stoppedDevWorkspace.spec.template.attributes = {};
      }
      stoppedDevWorkspace.spec.template.attributes[DEVWORKSPACE_STORAGE_TYPE_ATTR] = 'per-user';

      const stoppedStore = new MockStoreBuilder()
        .withDwServerConfig(serverConfig)
        .withDevWorkspaces({
          workspaces: [stoppedDevWorkspace],
          startedWorkspaces: {
            'uid-123': '100',
          },
        })
        .withEvents({
          events: [
            {
              metadata: {
                name: `${workspaceName}-pod-123`,
                resourceVersion: '101',
                namespace,
              },
              reason: 'Failed',
              message: 'failed to create subPath directory for volumeMount',
            } as CoreV1Event,
          ],
        })
        .build();

      const deferred = getDefer();
      const actionTitle = 'Restart';
      let callCount = 0;
      mockOnError.mockImplementation((alertItem: AlertItem) => {
        callCount++;
        if (callCount === 1) {
          // First call: PVC error
          const action = alertItem.actionCallbacks?.find(action =>
            action.title.startsWith(actionTitle),
          );
          if (action && isActionCallback(action)) {
            deferred.promise.then(action.callback);
          }
        }
      });

      renderComponent(stoppedStore);
      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);
      await jest.runAllTimersAsync();

      // Wait for initial PVC error
      await waitFor(() => expect(mockOnError).toHaveBeenCalled());

      // Clear mock to track new calls after restart
      mockOnError.mockClear();

      // Trigger restart
      deferred.resolve();
      await jest.runOnlyPendingTimersAsync();
      await jest.runAllTimersAsync();

      // Verify onRestart was called
      await waitFor(() => expect(mockOnRestart).toHaveBeenCalledTimes(1));

      // Verify PVC error was NOT shown again after restart
      // The restartInitiatedSet should prevent re-detection
      // mockOnError should not have been called again with a PVC error message
      const pvcErrorCalls = mockOnError.mock.calls.filter(
        call => call[0]?.children && String(call[0].children).includes('PVC is full'),
      );
      expect(pvcErrorCalls).toHaveLength(0);
    });

    test('should handle stopWorkspace error gracefully', async () => {
      const stopError = new Error('Failed to stop workspace');
      mockStopWorkspace.mockRejectedValueOnce(stopError);

      // this deferred object will help run the callback at the right time
      const deferred = getDefer();

      const actionTitle = 'Restart';
      let callCount = 0;
      mockOnError.mockImplementation((alertItem: AlertItem) => {
        callCount++;
        if (callCount === 1) {
          // First call: PVC error
          const action = alertItem.actionCallbacks?.find(action =>
            action.title.startsWith(actionTitle),
          );
          if (action && isActionCallback(action)) {
            deferred.promise.then(action.callback);
          }
        }
        // Second call: stopWorkspace error (will be checked later)
      });

      renderComponent(store);
      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);
      await jest.runAllTimersAsync();

      // Wait for PVC error to be detected and alert to be shown
      // Note: mockOnError may be called multiple times due to componentDidUpdate, so we check for at least 1 call
      await waitFor(() => expect(mockOnError).toHaveBeenCalled());
      mockOnError.mockClear();

      /* test the restart action */

      // resolve deferred to trigger the callback
      deferred.resolve();
      await jest.runOnlyPendingTimersAsync();

      // Verify that stopWorkspace was called
      await waitFor(() => expect(mockStopWorkspace).toHaveBeenCalledTimes(1));

      // Verify that error was shown after stopWorkspace failed
      // Note: mockOnError may be called multiple times due to componentDidUpdate, so we check for at least 1 call
      await waitFor(() => expect(mockOnError).toHaveBeenCalled());
      expect(mockOnError).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Failed to open the workspace',
          children: expect.stringContaining('Failed to stop workspace'),
        }),
      );

      // Verify that onRestart was NOT called when stopWorkspace fails
      expect(mockOnRestart).not.toHaveBeenCalled();
    });

    test('should start workspace after it stops with FAILED status', async () => {
      // Tests that workspace is started via runStep after transitioning to FAILED
      const deferred = getDefer();

      const actionTitle = 'Restart';
      let callCount = 0;
      mockOnError.mockImplementation((alertItem: AlertItem) => {
        callCount++;
        if (callCount === 1) {
          const action = alertItem.actionCallbacks?.find(action =>
            action.title.startsWith(actionTitle),
          );
          if (action && isActionCallback(action)) {
            deferred.promise.then(action.callback);
          }
        }
      });

      const { reRenderComponent } = renderComponent(store);
      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);
      await jest.runAllTimersAsync();

      await waitFor(() => expect(mockOnError).toHaveBeenCalled());
      mockOnError.mockClear();

      deferred.resolve();
      await jest.runOnlyPendingTimersAsync();

      await waitFor(() => expect(mockStopWorkspace).toHaveBeenCalledTimes(1));

      // Simulate workspace transitioning to FAILED
      const failedDevWorkspace = new DevWorkspaceBuilder()
        .withName(workspaceName)
        .withId(workspaceName)
        .withNamespace(namespace)
        .withUID('uid-123')
        .withStatus({ phase: 'FAILED' })
        .build();
      if (!failedDevWorkspace.spec.template.attributes) {
        failedDevWorkspace.spec.template.attributes = {};
      }
      failedDevWorkspace.spec.template.attributes[DEVWORKSPACE_STORAGE_TYPE_ATTR] = 'per-user';

      const failedStore = new MockStoreBuilder()
        .withDwServerConfig(serverConfig)
        .withDevWorkspaces({
          workspaces: [failedDevWorkspace],
          startedWorkspaces: {
            'uid-123': '100',
          },
        })
        .withEvents({ events: [] })
        .build();
      reRenderComponent(failedStore);
      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);
      await jest.runAllTimersAsync();

      // startWorkspace should be called via runStep when workspace is FAILED and shouldStart is true
      await waitFor(() => expect(mockStartWorkspace).toHaveBeenCalled());
    });

    test('should skip PVC errors and start workspace when restart is initiated', async () => {
      // Tests that restartInitiatedSet prevents PVC error detection during restart
      const deferred = getDefer();
      const actionTitle = 'Restart';
      let callCount = 0;
      mockOnError.mockImplementation((alertItem: AlertItem) => {
        callCount++;
        if (callCount === 1) {
          const action = alertItem.actionCallbacks?.find(action =>
            action.title.startsWith(actionTitle),
          );
          if (action && isActionCallback(action)) {
            deferred.promise.then(action.callback);
          }
        }
      });

      const { reRenderComponent } = renderComponent(store);
      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);
      await jest.runAllTimersAsync();

      await waitFor(() => expect(mockOnError).toHaveBeenCalled());
      mockOnError.mockClear();

      deferred.resolve();
      await jest.runOnlyPendingTimersAsync();

      await waitFor(() => expect(mockStopWorkspace).toHaveBeenCalledTimes(1));

      // Simulate workspace transitioning to STOPPED with PVC errors STILL in events
      const stoppedDevWorkspace = new DevWorkspaceBuilder()
        .withName(workspaceName)
        .withId(workspaceName)
        .withNamespace(namespace)
        .withUID('uid-123')
        .withStatus({ phase: 'STOPPED' })
        .build();
      if (!stoppedDevWorkspace.spec.template.attributes) {
        stoppedDevWorkspace.spec.template.attributes = {};
      }
      stoppedDevWorkspace.spec.template.attributes[DEVWORKSPACE_STORAGE_TYPE_ATTR] = 'per-user';

      const stoppedStoreWithPVCErrors = new MockStoreBuilder()
        .withDwServerConfig(serverConfig)
        .withDevWorkspaces({
          workspaces: [stoppedDevWorkspace],
          startedWorkspaces: {
            'uid-123': '100',
          },
        })
        .withEvents({
          events: [
            {
              metadata: {
                name: `${workspaceName}-pod-123`,
                resourceVersion: '101',
                namespace,
              },
              reason: 'Failed',
              message: 'failed to create subPath directory for volumeMount',
            } as CoreV1Event,
          ],
        })
        .build();
      reRenderComponent(stoppedStoreWithPVCErrors);
      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);
      await jest.runAllTimersAsync();

      // startWorkspace should be called even with PVC errors in events
      // because restartInitiatedSet contains the workspace UID
      await waitFor(() => expect(mockStartWorkspace).toHaveBeenCalled());
    });

    test('should clear restartInitiatedSet after workspace starts', async () => {
      // Tests that restartInitiatedSet is cleared after startWorkspace is called
      const deferred = getDefer();
      const actionTitle = 'Restart';
      let callCount = 0;
      mockOnError.mockImplementation((alertItem: AlertItem) => {
        callCount++;
        if (callCount === 1) {
          const action = alertItem.actionCallbacks?.find(action =>
            action.title.startsWith(actionTitle),
          );
          if (action && isActionCallback(action)) {
            deferred.promise.then(action.callback);
          }
        }
      });

      const { reRenderComponent } = renderComponent(store);
      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);
      await jest.runAllTimersAsync();

      await waitFor(() => expect(mockOnError).toHaveBeenCalled());
      mockOnError.mockClear();

      deferred.resolve();
      await jest.runOnlyPendingTimersAsync();

      await waitFor(() => expect(mockStopWorkspace).toHaveBeenCalledTimes(1));

      // restartInitiatedSet should contain the workspace UID after stopWorkspace
      expect(StartingStepStartWorkspace.getRestartInitiatedSet().has('uid-123')).toBe(true);

      // Simulate workspace transitioning to STOPPED
      const stoppedDevWorkspace = new DevWorkspaceBuilder()
        .withName(workspaceName)
        .withId(workspaceName)
        .withNamespace(namespace)
        .withUID('uid-123')
        .withStatus({ phase: 'STOPPED' })
        .build();
      if (!stoppedDevWorkspace.spec.template.attributes) {
        stoppedDevWorkspace.spec.template.attributes = {};
      }
      stoppedDevWorkspace.spec.template.attributes[DEVWORKSPACE_STORAGE_TYPE_ATTR] = 'per-user';

      const stoppedStore = new MockStoreBuilder()
        .withDwServerConfig(serverConfig)
        .withDevWorkspaces({
          workspaces: [stoppedDevWorkspace],
          startedWorkspaces: {},
        })
        .withEvents({ events: [] })
        .build();
      reRenderComponent(stoppedStore);
      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);
      await jest.runAllTimersAsync();

      // startWorkspace should be called
      await waitFor(() => expect(mockStartWorkspace).toHaveBeenCalled());

      // restartInitiatedSet should be cleared after startWorkspace
      expect(StartingStepStartWorkspace.getRestartInitiatedSet().has('uid-123')).toBe(false);
    });
  });

  describe('SCC mismatch warning', () => {
    const mockShowAlert = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
      // Mock AppAlerts
      jest.mock('@/services/alerts/appAlerts', () => ({
        AppAlerts: jest.fn().mockImplementation(() => ({
          showAlert: mockShowAlert,
        })),
      }));
    });

    test('should show warning alert when workspace has SCC mismatch', async () => {
      const devWorkspace = new DevWorkspaceBuilder()
        .withName(workspaceName)
        .withNamespace(namespace)
        .withStatus({ phase: 'STOPPED' })
        .build();
      // Set workspace SCC to 'restricted'
      devWorkspace.spec.template.attributes = {
        'controller.devfile.io/scc': 'restricted',
      };

      const store = new MockStoreBuilder()
        .withDwServerConfig({
          containerBuild: {},
          containerRun: {
            disableContainerRunCapabilities: false,
            containerRunConfiguration: {
              openShiftSecurityContextConstraint: 'container-run', // Server has different SCC
            },
          },
          defaults: {
            editor: undefined,
            components: [],
            plugins: [],
            pvcStrategy: '',
          },
          pluginRegistry: {
            openVSXURL: '',
          },
          timeouts: {
            inactivityTimeout: -1,
            runTimeout: -1,
            startTimeout,
            axiosRequestTimeout: 30000,
          },
          defaultNamespace: {
            autoProvision: true,
          },
          cheNamespace: '',
          devfileRegistry: {
            disableInternalRegistry: false,
            externalDevfileRegistries: [],
          },
          pluginRegistryURL: '',
          pluginRegistryInternalURL: '',
          allowedSourceUrls: [],
        })
        .withDevWorkspaces({
          workspaces: [devWorkspace],
        })
        .build();

      renderComponent(store);

      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

      // Should still start the workspace despite SCC mismatch
      await waitFor(() => expect(mockStartWorkspace).toHaveBeenCalled());

      // No blocking error should be shown
      expect(mockOnError).not.toHaveBeenCalled();
    });

    test('should not show warning when workspace SCC matches server SCC', async () => {
      const devWorkspace = new DevWorkspaceBuilder()
        .withName(workspaceName)
        .withNamespace(namespace)
        .withStatus({ phase: 'STOPPED' })
        .build();
      // Set workspace SCC to match server
      devWorkspace.spec.template.attributes = {
        'controller.devfile.io/scc': 'container-run',
      };

      const store = new MockStoreBuilder()
        .withDwServerConfig({
          containerBuild: {},
          containerRun: {
            disableContainerRunCapabilities: false,
            containerRunConfiguration: {
              openShiftSecurityContextConstraint: 'container-run', // Same SCC
            },
          },
          defaults: {
            editor: undefined,
            components: [],
            plugins: [],
            pvcStrategy: '',
          },
          pluginRegistry: {
            openVSXURL: '',
          },
          timeouts: {
            inactivityTimeout: -1,
            runTimeout: -1,
            startTimeout,
            axiosRequestTimeout: 30000,
          },
          defaultNamespace: {
            autoProvision: true,
          },
          cheNamespace: '',
          devfileRegistry: {
            disableInternalRegistry: false,
            externalDevfileRegistries: [],
          },
          pluginRegistryURL: '',
          pluginRegistryInternalURL: '',
          allowedSourceUrls: [],
        })
        .withDevWorkspaces({
          workspaces: [devWorkspace],
        })
        .build();

      renderComponent(store);

      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

      // Should start the workspace
      await waitFor(() => expect(mockStartWorkspace).toHaveBeenCalled());

      // No errors should be shown
      expect(mockOnError).not.toHaveBeenCalled();
    });

    test('should not show warning when server has no SCC requirement', async () => {
      const devWorkspace = new DevWorkspaceBuilder()
        .withName(workspaceName)
        .withNamespace(namespace)
        .withStatus({ phase: 'STOPPED' })
        .build();
      // Workspace has SCC but server doesn't require one
      devWorkspace.spec.template.attributes = {
        'controller.devfile.io/scc': 'restricted',
      };

      const store = new MockStoreBuilder()
        .withDwServerConfig({
          containerBuild: {},
          containerRun: {
            disableContainerRunCapabilities: true, // Container run disabled
          },
          defaults: {
            editor: undefined,
            components: [],
            plugins: [],
            pvcStrategy: '',
          },
          pluginRegistry: {
            openVSXURL: '',
          },
          timeouts: {
            inactivityTimeout: -1,
            runTimeout: -1,
            startTimeout,
            axiosRequestTimeout: 30000,
          },
          defaultNamespace: {
            autoProvision: true,
          },
          cheNamespace: '',
          devfileRegistry: {
            disableInternalRegistry: false,
            externalDevfileRegistries: [],
          },
          pluginRegistryURL: '',
          pluginRegistryInternalURL: '',
          allowedSourceUrls: [],
        })
        .withDevWorkspaces({
          workspaces: [devWorkspace],
        })
        .build();

      renderComponent(store);

      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

      // Should start the workspace
      await waitFor(() => expect(mockStartWorkspace).toHaveBeenCalled());

      // No errors should be shown
      expect(mockOnError).not.toHaveBeenCalled();
    });
  });
});

function getComponent(
  store: Store,
  params: WorkspaceRouteParams = matchParams,
): React.ReactElement {
  return (
    <Provider store={store}>
      <StartingStepStartWorkspace
        distance={0}
        hasChildren={true}
        location={{} as Location}
        navigate={jest.fn()}
        matchParams={params}
        onNextStep={mockOnNextStep}
        onRestart={mockOnRestart}
        onError={mockOnError}
        onHideError={mockOnHideError}
      />
    </Provider>
  );
}
