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

import { StateMock } from '@react-mock/state';
import { waitFor } from '@testing-library/react';
import userEvent, { UserEvent } from '@testing-library/user-event';
import React from 'react';
import { Provider } from 'react-redux';
import { Location } from 'react-router-dom';
import { Store } from 'redux';

import { MIN_STEP_DURATION_MS, TIMEOUT_TO_STOP_SEC } from '@/components/WorkspaceProgress/const';
import { container } from '@/inversify.config';
import { WorkspaceRouteParams } from '@/Routes';
import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';
import devfileApi from '@/services/devfileApi';
import { getDefer } from '@/services/helpers/deferred';
import { AlertItem } from '@/services/helpers/types';
import { TabManager } from '@/services/tabManager';
import { constructWorkspace } from '@/services/workspace-adapter';
import { AppThunk } from '@/store';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';
import { devWorkspacesClusterActionCreators } from '@/store/DevWorkspacesCluster';
import { workspacesActionCreators } from '@/store/Workspaces';

import CommonStepCheckRunningWorkspacesLimit, { State } from '..';

jest.mock('@/components/WorkspaceProgress/TimeLimit');

const mockStartWorkspace = jest.fn();
const mockStopWorkspace = jest.fn();
const mockRequestRunningDevWorkspacesClusterLimitExceeded = jest.fn();

jest.mock('@/store/Workspaces', () => {
  return {
    ...jest.requireActual('@/store/Workspaces'),
    workspacesActionCreators: {
      startWorkspace:
        (...args: Parameters<(typeof workspacesActionCreators)['startWorkspace']>): AppThunk =>
        async (): Promise<void> => {
          return mockStartWorkspace(...args);
        },
      stopWorkspace:
        (...args: Parameters<(typeof workspacesActionCreators)['startWorkspace']>): AppThunk =>
        async (): Promise<void> => {
          return mockStopWorkspace(...args);
        },
    } as typeof workspacesActionCreators,
  };
});

jest.mock('@/store/DevWorkspacesCluster', () => {
  const realModule = jest.requireActual('@/store/DevWorkspacesCluster');
  return {
    ...realModule,
    devWorkspacesClusterActionCreators: {
      requestRunningDevWorkspacesClusterLimitExceeded: (): AppThunk => async (): Promise<void> => {
        return mockRequestRunningDevWorkspacesClusterLimitExceeded();
      },
    } as typeof devWorkspacesClusterActionCreators,
  };
});

const mockOnNextStep = jest.fn();
const mockOnRestart = jest.fn();
const mockOnError = jest.fn();
const mockOnHideError = jest.fn();

const mockNavigate = jest.fn();
const mockTabManagerOpen = jest.fn();

const { renderComponent } = getComponentRenderer(getComponent);

const namespace = 'che-user';

const workspaceName = 'test-workspace';
const matchParams: WorkspaceRouteParams = {
  namespace,
  workspaceName,
};
const targetDevworkspace = new DevWorkspaceBuilder()
  .withName(workspaceName)
  .withNamespace(namespace)
  .build();

describe('Common steps, check running workspaces limit', () => {
  let runningDevworkspaceBuilder1: DevWorkspaceBuilder;
  let runningDevworkspaceBuilder2: DevWorkspaceBuilder;
  let stoppedDevworkspaceBuilder: DevWorkspaceBuilder;
  let user: UserEvent;

  beforeEach(() => {
    runningDevworkspaceBuilder1 = new DevWorkspaceBuilder()
      .withName('wksp-1')
      .withStatus({ phase: 'RUNNING' })
      .withSpec({ started: true })
      .withNamespace(namespace);
    runningDevworkspaceBuilder2 = new DevWorkspaceBuilder()
      .withName('wksp-2')
      .withStatus({ phase: 'RUNNING' })
      .withSpec({ started: true })
      .withNamespace(namespace);
    stoppedDevworkspaceBuilder = new DevWorkspaceBuilder()
      .withName('wksp-3')
      .withStatus({ phase: 'STOPPED' })
      .withSpec({ started: false })
      .withNamespace(namespace);

    jest.useFakeTimers();

    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    class MockTabManager extends TabManager {
      public open(url: string): void {
        mockTabManagerOpen(url);
      }
    }

    container.snapshot();
    container.rebind(TabManager).to(MockTabManager).inSingletonScope();
  });

  afterEach(() => {
    container.restore();
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('number of running workspaces is below the limit', async () => {
    const runningDevworkspace = runningDevworkspaceBuilder1.build();
    const stoppedDevworkspace = stoppedDevworkspaceBuilder.build();
    const store = new MockStoreBuilder()
      .withDevWorkspaces({
        workspaces: [runningDevworkspace, stoppedDevworkspace],
      })
      .withClusterConfig({
        runningWorkspacesLimit: 2,
      })
      .build();

    renderComponent(store, {
      shouldCheckLimits: false,
      shouldStop: false,
      name: 'Checking for the limit of running workspaces',
    });
    await jest.runOnlyPendingTimersAsync();

    await waitFor(() => expect(mockOnNextStep).toHaveBeenCalled());
    expect(mockOnError).not.toHaveBeenCalled();
    expect(mockOnRestart).not.toHaveBeenCalled();
  });

  test('should check cluster limit of running workspaces', async () => {
    const runningDevworkspace = runningDevworkspaceBuilder1.build();
    const stoppedDevworkspace = stoppedDevworkspaceBuilder.build();
    const store = new MockStoreBuilder()
      .withDevWorkspaces({
        workspaces: [runningDevworkspace, stoppedDevworkspace],
      })
      .withDevWorkspacesCluster({
        isRunningDevWorkspacesClusterLimitExceeded: false,
      })
      .build();

    renderComponent(store, {
      shouldCheckLimits: true,
      shouldStop: false,
      name: 'Checking for the limit of running workspaces',
    });
    await jest.runOnlyPendingTimersAsync();

    expect(mockOnNextStep).not.toHaveBeenCalled();
    expect(mockOnError).not.toHaveBeenCalled();
    expect(mockOnRestart).not.toHaveBeenCalled();
  });

  test('should throw error if cluster limit of running workspaces exceeded', async () => {
    const runningDevworkspace = runningDevworkspaceBuilder1.build();
    const stoppedDevworkspace = stoppedDevworkspaceBuilder.build();
    const store = new MockStoreBuilder()
      .withDevWorkspaces({
        workspaces: [runningDevworkspace, stoppedDevworkspace],
      })
      .withDevWorkspacesCluster({
        isRunningDevWorkspacesClusterLimitExceeded: true,
      })
      .build();

    renderComponent(store, {
      shouldCheckLimits: false,
      shouldStop: false,
      name: 'Checking for the limit of running workspaces',
    });

    await jest.runAllTimersAsync();

    // need to flush promises
    await Promise.resolve();

    const expectAlertItem = expect.objectContaining({
      title: 'Running workspace(s) found.',
      children: 'Exceeded the cluster limit for running DevWorkspaces',
      actionCallbacks: [
        expect.objectContaining({
          title: 'Close running workspace (wksp-1) and restart',
          callback: expect.any(Function),
        }),
        expect.objectContaining({
          title: 'Switch to running workspace (wksp-1) to save any changes',
          callback: expect.any(Function),
        }),
      ],
    });
    await waitFor(() => expect(mockOnError).toHaveBeenCalledWith(expectAlertItem));

    expect(mockOnNextStep).not.toHaveBeenCalled();
    expect(mockOnRestart).not.toHaveBeenCalled();
  });

  describe('start a workspace above the limit, limit equals 1', () => {
    let store: Store;
    let runningDevworkspace: devfileApi.DevWorkspace;
    let stoppedDevworkspace: devfileApi.DevWorkspace;

    beforeEach(() => {
      runningDevworkspace = runningDevworkspaceBuilder1.build();
      stoppedDevworkspace = stoppedDevworkspaceBuilder.build();
      store = new MockStoreBuilder()
        .withDevWorkspaces({
          workspaces: [targetDevworkspace, runningDevworkspace, stoppedDevworkspace],
        })
        .withClusterConfig({
          runningWorkspacesLimit: 1,
        })
        .build();
    });

    test('alert notification', async () => {
      renderComponent(store, {
        shouldCheckLimits: false,
        shouldStop: false,
        name: 'Checking for the limit of running workspaces',
      });
      await jest.runAllTimersAsync();

      // need to flush promises
      await Promise.resolve();

      const expectAlertItem = expect.objectContaining({
        title: 'Running workspace(s) found.',
        children: 'You can only have 1 running workspace at a time.',
        actionCallbacks: [
          expect.objectContaining({
            title: 'Close running workspace (wksp-1) and restart',
            callback: expect.any(Function),
          }),
          expect.objectContaining({
            title: 'Switch to running workspace (wksp-1) to save any changes',
            callback: expect.any(Function),
          }),
        ],
      });
      await waitFor(() => expect(mockOnError).toHaveBeenCalledWith(expectAlertItem));

      expect(mockOnNextStep).not.toHaveBeenCalled();
      expect(mockOnRestart).not.toHaveBeenCalled();
    });

    test('action callback to stop the running workspace', async () => {
      // this deferred object will help run the callback at the right time
      const deferred = getDefer();

      mockOnError.mockImplementationOnce((alertItem: AlertItem) => {
        const closeWorkspaceAction = alertItem.actionCallbacks?.find(action =>
          action.title.startsWith('Close running workspace'),
        );
        expect(closeWorkspaceAction).toBeDefined();

        if (closeWorkspaceAction) {
          deferred.promise.then(closeWorkspaceAction.callback);
        } else {
          throw new Error('Action not found');
        }
      });

      renderComponent(store, {
        shouldCheckLimits: false,
        shouldStop: false,
        name: 'Checking for the limit of running workspaces',
      });
      await jest.runAllTimersAsync();

      await waitFor(() => expect(mockOnError).toHaveBeenCalled());
      expect(mockOnNextStep).not.toHaveBeenCalled();
      expect(mockOnRestart).not.toHaveBeenCalled();

      // resolve deferred to trigger the callback
      deferred.resolve();
      await jest.runOnlyPendingTimersAsync();

      /* test the action */

      await waitFor(() => expect(mockStopWorkspace).toHaveBeenCalled());
    });

    test('action callback to switch to the running workspace', async () => {
      // this deferred object will help run the callback at the right time
      const deferred = getDefer();

      mockOnError.mockImplementationOnce((alertItem: AlertItem) => {
        const switchWorkspaceAction = alertItem.actionCallbacks?.find(action =>
          action.title.startsWith('Switch to running workspace'),
        );
        expect(switchWorkspaceAction).toBeDefined();

        if (switchWorkspaceAction) {
          deferred.promise.then(switchWorkspaceAction.callback);
        } else {
          throw new Error('Action not found');
        }
      });

      renderComponent(store, {
        shouldCheckLimits: false,
        shouldStop: false,
        name: 'Checking for the limit of running workspaces',
      });
      await jest.runOnlyPendingTimersAsync();

      await waitFor(() => expect(mockOnError).toHaveBeenCalled());
      expect(mockOnNextStep).not.toHaveBeenCalled();
      expect(mockOnRestart).not.toHaveBeenCalled();

      /* test the action */

      // resolve deferred to trigger restart
      deferred.resolve();
      await jest.runOnlyPendingTimersAsync();

      await waitFor(() =>
        expect(mockTabManagerOpen).toHaveBeenCalledWith(
          expect.stringContaining(`/ide/${namespace}/${runningDevworkspace.metadata.name}`),
        ),
      );
    });

    describe('stopping the redundant workspace', () => {
      let localState: Partial<State>;
      let redundantDevworkspace: devfileApi.DevWorkspace;
      let workspaceLimitStore: Store;

      beforeEach(() => {
        redundantDevworkspace = new DevWorkspaceBuilder()
          .withStatus({ phase: 'STOPPING' })
          .withId(runningDevworkspace.metadata.uid)
          .build();
        localState = {
          shouldStop: true,
          shouldCheckLimits: false,
          redundantWorkspaceUID: constructWorkspace(redundantDevworkspace).uid,
        };
        workspaceLimitStore = new MockStoreBuilder(store.getState())
          .withDevWorkspaces({
            workspaces: [targetDevworkspace, redundantDevworkspace, stoppedDevworkspace],
          })
          .build();
      });

      test('timeout expired alert notification', async () => {
        renderComponent(workspaceLimitStore, localState);

        // imitate the timeout has been expired
        const timeoutButton = screen.getByRole('button', { name: 'onTimeout' });
        await user.click(timeoutButton);

        const expectAlertItem = expect.objectContaining({
          title: 'Failed to open the workspace',
          children: `The workspace status remains "Stopping" in the last ${TIMEOUT_TO_STOP_SEC} seconds.`,
          actionCallbacks: [
            expect.objectContaining({
              title: 'Restart',
              callback: expect.any(Function),
            }),
          ],
        });
        await waitFor(() => expect(mockOnError).toHaveBeenCalledWith(expectAlertItem));

        expect(mockOnNextStep).not.toHaveBeenCalled();
        expect(mockOnRestart).not.toHaveBeenCalled();
      });

      test('action callback to restart the step', async () => {
        // this deferred object will help run the callback at the right time
        const deferred = getDefer();

        mockOnError.mockImplementationOnce((alertItem: AlertItem) => {
          const restartAction = alertItem.actionCallbacks?.find(
            action => action.title === 'Restart',
          );
          expect(restartAction).toBeDefined();

          if (restartAction) {
            deferred.promise.then(restartAction.callback);
          } else {
            throw new Error('Action not found');
          }
        });

        renderComponent(store, localState);

        // imitate the timeout has been expired
        const timeoutButton = screen.getByRole('button', { name: 'onTimeout' });
        await user.click(timeoutButton);

        await waitFor(() => expect(mockOnError).toHaveBeenCalled());
        expect(mockOnNextStep).not.toHaveBeenCalled();
        expect(mockOnRestart).not.toHaveBeenCalled();

        mockOnError.mockClear();

        /* test the action */

        // resolve deferred to trigger restart
        deferred.resolve();
        await jest.runOnlyPendingTimersAsync();

        await waitFor(() => expect(mockOnRestart).toHaveBeenCalled());
        expect(mockOnNextStep).not.toHaveBeenCalled();
        expect(mockOnError).toHaveBeenCalled();
      });

      test('the redundant workspace has been stopped', async () => {
        mockStopWorkspace.mockResolvedValue(undefined);

        store = new MockStoreBuilder()
          .withDevWorkspaces({
            workspaces: [targetDevworkspace, redundantDevworkspace, stoppedDevworkspace],
          })
          .withClusterConfig({
            runningWorkspacesLimit: 1,
          })
          .build();
        const { reRenderComponent } = renderComponent(store, localState);
        await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

        const nextRedundantDevworkspace = new DevWorkspaceBuilder()
          .withStatus({ phase: 'STOPPED' })
          .withId(redundantDevworkspace.metadata.uid)
          .withSpec({ started: false })
          .build();
        const nextStore = new MockStoreBuilder()
          .withDevWorkspaces({
            workspaces: [targetDevworkspace, nextRedundantDevworkspace, stoppedDevworkspace],
          })
          .build();
        reRenderComponent(nextStore, {
          shouldCheckLimits: false,
          shouldStop: false,
          redundantWorkspaceUID: nextRedundantDevworkspace.status?.devworkspaceId,
          name: 'Checking for the limit of running workspaces',
        });
        await jest.runOnlyPendingTimersAsync();

        // switch to the next step
        await waitFor(() => expect(mockOnNextStep).toHaveBeenCalled());
        expect(mockOnError).not.toHaveBeenCalled();
        expect(mockOnRestart).not.toHaveBeenCalled();
      });
    });
  });

  describe('start a workspace above the cluster limit, limit equals 2', () => {
    let storeBuilder: MockStoreBuilder;
    let runningDevworkspace1: devfileApi.DevWorkspace;
    let runningDevworkspace2: devfileApi.DevWorkspace;

    beforeEach(() => {
      runningDevworkspace1 = runningDevworkspaceBuilder1.build();
      runningDevworkspace2 = runningDevworkspaceBuilder1.build();
      storeBuilder = new MockStoreBuilder()
        .withDevWorkspaces({
          workspaces: [targetDevworkspace, runningDevworkspace1, runningDevworkspace2],
        })
        .withClusterConfig({
          runningWorkspacesLimit: 10,
        });
    });

    test('alert notification', async () => {
      const store = storeBuilder
        .withDevWorkspacesCluster({ isRunningDevWorkspacesClusterLimitExceeded: true })
        .build();
      renderComponent(store, {
        shouldCheckLimits: false,
        shouldStop: false,
        name: 'Checking for the limit of running workspaces',
      });
      await jest.runAllTimersAsync();

      const expectAlertItem = expect.objectContaining({
        title: 'Running workspace(s) found.',
        children: 'Exceeded the cluster limit for running DevWorkspaces',
        actionCallbacks: [
          expect.objectContaining({
            title: 'Return to dashboard',
            callback: expect.any(Function),
          }),
        ],
      });
      await waitFor(() => expect(mockOnError).toHaveBeenCalledWith(expectAlertItem));
      expect(mockOnNextStep).not.toHaveBeenCalled();
      expect(mockOnRestart).not.toHaveBeenCalled();
    });

    test('start a workspace', async () => {
      const store = storeBuilder
        .withDevWorkspacesCluster({ isRunningDevWorkspacesClusterLimitExceeded: false })
        .build();
      renderComponent(store, {
        shouldCheckLimits: false,
        shouldStop: false,
        name: 'Checking for the limit of running workspaces',
      });
      await jest.runAllTimersAsync();

      expect(mockOnError).not.toHaveBeenCalled();
      expect(mockOnNextStep).toHaveBeenCalled();
      expect(mockOnRestart).not.toHaveBeenCalled();
    });
  });

  describe('start a workspace above the limit, limit equals 2', () => {
    let store: Store;
    let runningDevworkspace1: devfileApi.DevWorkspace;
    let runningDevworkspace2: devfileApi.DevWorkspace;
    let stoppedDevworkspace: devfileApi.DevWorkspace;

    beforeEach(() => {
      runningDevworkspace1 = runningDevworkspaceBuilder1.build();
      runningDevworkspace2 = runningDevworkspaceBuilder2.build();
      stoppedDevworkspace = stoppedDevworkspaceBuilder.build();
      store = new MockStoreBuilder()
        .withDevWorkspaces({
          workspaces: [
            targetDevworkspace,
            runningDevworkspace1,
            runningDevworkspace2,
            stoppedDevworkspace,
          ],
        })
        .withClusterConfig({
          runningWorkspacesLimit: 2,
        })
        .build();
    });

    test('alert notification', async () => {
      renderComponent(store, {
        shouldCheckLimits: false,
        shouldStop: false,
        name: 'Checking for the limit of running workspaces',
      });
      await jest.runAllTimersAsync();

      const expectAlertItem = expect.objectContaining({
        title: 'Running workspace(s) found.',
        children: 'You can only have 2 running workspaces at a time.',
        actionCallbacks: [
          expect.objectContaining({
            title: 'Return to dashboard',
            callback: expect.any(Function),
          }),
        ],
      });
      await waitFor(() => expect(mockOnError).toHaveBeenCalledWith(expectAlertItem));
      expect(mockOnNextStep).not.toHaveBeenCalled();
      expect(mockOnRestart).not.toHaveBeenCalled();
    });

    test('action callback to return to the dashboard', async () => {
      // this deferred object will help run the callback at the right time
      const deferred = getDefer();

      mockOnError.mockImplementationOnce((alertItem: AlertItem) => {
        const returnToDashboardAction = alertItem.actionCallbacks?.find(
          action => action.title === 'Return to dashboard',
        );
        expect(returnToDashboardAction).toBeDefined();

        if (returnToDashboardAction) {
          deferred.promise.then(returnToDashboardAction.callback);
        } else {
          throw new Error('Action not found');
        }
      });

      renderComponent(store, {
        shouldCheckLimits: false,
        shouldStop: false,
        name: 'Checking for the limit of running workspaces',
      });
      await jest.runOnlyPendingTimersAsync();

      await waitFor(() => expect(mockOnError).toHaveBeenCalled());
      expect(mockOnNextStep).not.toHaveBeenCalled();
      expect(mockOnRestart).not.toHaveBeenCalled();

      /* test the callback */

      // resolve deferred to trigger restart
      deferred.resolve();
      await jest.runAllTimersAsync();

      await waitFor(() =>
        expect(mockNavigate).toHaveBeenCalledWith(
          expect.objectContaining({ pathname: `/`, search: '' }),
        ),
      );
    });
  });
});

function getComponent(store: Store, localState?: Partial<State>): React.ReactElement {
  const component = (
    <CommonStepCheckRunningWorkspacesLimit
      distance={0}
      hasChildren={false}
      location={{} as Location}
      navigate={mockNavigate}
      matchParams={matchParams}
      onNextStep={mockOnNextStep}
      onRestart={mockOnRestart}
      onError={mockOnError}
      onHideError={mockOnHideError}
    />
  );
  if (localState) {
    return (
      <Provider store={store}>
        <StateMock state={localState}>{component}</StateMock>
      </Provider>
    );
  } else {
    return <Provider store={store}>{component}</Provider>;
  }
}
