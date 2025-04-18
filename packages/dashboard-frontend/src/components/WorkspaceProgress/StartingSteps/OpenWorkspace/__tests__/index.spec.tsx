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

import { screen, waitFor } from '@testing-library/react';
import userEvent, { UserEvent } from '@testing-library/user-event';
import React from 'react';
import { Provider } from 'react-redux';
import { Location } from 'react-router-dom';
import { Store } from 'redux';

import { MIN_STEP_DURATION_MS, TIMEOUT_TO_GET_URL_SEC } from '@/components/WorkspaceProgress/const';
import { container } from '@/inversify.config';
import { WorkspaceRouteParams } from '@/Routes';
import getComponentRenderer from '@/services/__mocks__/getComponentRenderer';
import { getDefer } from '@/services/helpers/deferred';
import { AlertItem } from '@/services/helpers/types';
import { TabManager } from '@/services/tabManager';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';

import StartingStepOpenWorkspace from '..';

jest.mock('@/components/WorkspaceProgress/TimeLimit');

const isAvailableEndpointMock = jest.fn();
jest.mock('@/services/helpers/api-ping', () => ({
  isAvailableEndpoint: (url: string | undefined) => isAvailableEndpointMock(url),
}));

const { renderComponent } = getComponentRenderer(getComponent);

const mockOnNextStep = jest.fn();
const mockOnRestart = jest.fn();
const mockOnError = jest.fn();
const mockOnHideError = jest.fn();

const namespace = 'che-user';
const workspaceName = 'test-workspace';
const matchParams: WorkspaceRouteParams = {
  namespace,
  workspaceName,
};

describe('Starting steps, opening an editor', () => {
  let tabManager: TabManager;
  let user: UserEvent;

  beforeEach(() => {
    container.snapshot();
    tabManager = container.get(TabManager);
    tabManager.replace = jest.fn();

    jest.useFakeTimers();

    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
    container.restore();
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

        if (action) {
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
      await jest.runOnlyPendingTimersAsync();

      // resolve deferred to trigger the callback
      deferred.resolve();

      // this mock is called from the action callback above
      await waitFor(() => expect(mockOnRestart).toHaveBeenCalled());
      expect(mockOnNextStep).not.toHaveBeenCalled();
      expect(mockOnError).not.toHaveBeenCalled();
    });
  });

  test('workspace status change from STOPPING to RUNNING', async () => {
    isAvailableEndpointMock.mockResolvedValue(true);

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
    const { reRenderComponent } = renderComponent(store);

    await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

    expect(mockOnError).not.toHaveBeenCalledWith();
    expect(mockOnNextStep).not.toHaveBeenCalled();
    expect(mockOnRestart).not.toHaveBeenCalled();

    const storeNext = new MockStoreBuilder()
      .withDevWorkspaces({
        workspaces: [
          new DevWorkspaceBuilder()
            .withName(workspaceName)
            .withNamespace(namespace)
            .withStatus({ phase: 'RUNNING', mainUrl: 'main-url' })
            .build(),
        ],
      })
      .build();
    reRenderComponent(storeNext);

    await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

    await waitFor(() => expect(tabManager.replace).toHaveBeenCalledWith('main-url'));

    expect(mockOnNextStep).toHaveBeenCalled();
    expect(mockOnError).not.toHaveBeenCalled();
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

    expect(mockOnNextStep).not.toHaveBeenCalled();
    expect(mockOnRestart).not.toHaveBeenCalled();
  });

  describe('with available endpoint', () => {
    beforeEach(() => {
      isAvailableEndpointMock.mockResolvedValue(Promise.resolve(true));
    });

    test('mainUrl is present', async () => {
      const store = new MockStoreBuilder()
        .withDevWorkspaces({
          workspaces: [
            new DevWorkspaceBuilder()
              .withName(workspaceName)
              .withNamespace(namespace)
              .withStatus({ phase: 'RUNNING', mainUrl: 'main-url' })
              .build(),
          ],
        })
        .build();

      renderComponent(store);

      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

      // wait for opening IDE url
      await waitFor(() => expect(tabManager.replace).toHaveBeenCalledWith('main-url'));
    });

    test(`mainUrl is propagated after some time`, async () => {
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
              .withStatus({ phase: 'RUNNING', mainUrl: 'main-url' })
              .build(),
          ],
        })
        .build();
      reRenderComponent(nextStore);

      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

      // wait for opening IDE url
      await waitFor(() => expect(tabManager.replace).toHaveBeenCalledWith('main-url'));

      expect(mockOnError).not.toHaveBeenCalled();
    });
  });

  describe('without available endpoint', () => {
    beforeEach(() => {
      isAvailableEndpointMock.mockResolvedValue(Promise.resolve(false));
    });

    test('mainUrl is present', async () => {
      const store = new MockStoreBuilder()
        .withDevWorkspaces({
          workspaces: [
            new DevWorkspaceBuilder()
              .withName(workspaceName)
              .withNamespace(namespace)
              .withStatus({ phase: 'RUNNING', mainUrl: 'main-url' })
              .build(),
          ],
        })
        .build();

      renderComponent(store);

      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

      // IDE is not opened
      expect(tabManager.replace).not.toHaveBeenCalled();
    });

    test('mainUrl is propagated after some time', async () => {
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
              .withStatus({ phase: 'RUNNING', mainUrl: 'main-url' })
              .build(),
          ],
        })
        .build();
      reRenderComponent(nextStore);

      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

      // IDE is not opened
      expect(tabManager.replace).not.toHaveBeenCalled();
    });
  });

  describe('step timeout reached', () => {
    let store: Store;

    beforeEach(() => {
      store = new MockStoreBuilder()
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
    });

    test('should not show notification alert if STARTING', async () => {
      store = new MockStoreBuilder()
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
      renderComponent(store);
      await jest.runAllTimersAsync();

      // trigger timeout
      const timeoutButton = screen.queryByRole('button', {
        name: 'onTimeout',
      });
      expect(timeoutButton).toBeNull();
      expect(mockOnError).not.toHaveBeenCalled();
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
        children: `The workspace has not received an IDE URL in the last ${TIMEOUT_TO_GET_URL_SEC} seconds. Try to re-open the workspace.`,
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

        if (action) {
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
      deferred.resolve();
      await jest.runOnlyPendingTimersAsync();

      await waitFor(() => expect(mockOnRestart).toHaveBeenCalled());
      expect(mockOnNextStep).not.toHaveBeenCalled();
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
      <StartingStepOpenWorkspace
        distance={0}
        hasChildren={false}
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
