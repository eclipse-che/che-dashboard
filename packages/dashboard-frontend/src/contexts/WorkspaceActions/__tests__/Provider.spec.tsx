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

import userEvent, { UserEvent } from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Provider } from 'react-redux';
import { Store } from 'redux';

import {
  ActionContextType,
  WantDelete,
  WorkspaceActionsConsumer,
} from '@/contexts/WorkspaceActions';
import WorkspaceActionsProvider from '@/contexts/WorkspaceActions/Provider';
import { container } from '@/inversify.config';
import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';
import { WorkspaceAction } from '@/services/helpers/types';
import { TabManager } from '@/services/tabManager';
import { AppThunk } from '@/store';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';
import { workspacesActionCreators } from '@/store/Workspaces';

jest.mock('@/contexts/WorkspaceActions/DeleteConfirmation');

const mockDeleteWorkspace = jest.fn();
const mockStartWorkspace = jest.fn();
const mockStopWorkspace = jest.fn();
const mockRestartWorkspace = jest.fn();
jest.mock('@/store/Workspaces', () => {
  return {
    ...jest.requireActual('@/store/Workspaces'),
    workspacesActionCreators: {
      deleteWorkspace:
        (...args: Parameters<(typeof workspacesActionCreators)['deleteWorkspace']>): AppThunk =>
        async () =>
          mockDeleteWorkspace(...args),
      startWorkspace:
        (...args: Parameters<(typeof workspacesActionCreators)['startWorkspace']>): AppThunk =>
        async () =>
          mockStartWorkspace(...args),
      stopWorkspace:
        (...args: Parameters<(typeof workspacesActionCreators)['stopWorkspace']>): AppThunk =>
        async () =>
          mockStopWorkspace(...args),
      restartWorkspace:
        (...args: Parameters<(typeof workspacesActionCreators)['restartWorkspace']>): AppThunk =>
        async () =>
          mockRestartWorkspace(...args),
    } as typeof workspacesActionCreators,
  };
});

const { renderComponent } = getComponentRenderer(getComponent);

const wantDelete = ['1234', '5678'] as WantDelete;

const mockHandleAction: jest.Mock = jest.fn();

const mockWindowReplace = jest.fn();

const mockTabManagerOpen = jest.fn();

describe('WorkspaceActionsProvider', () => {
  let store: Store;
  let user: UserEvent;

  beforeEach(() => {
    store = new MockStoreBuilder()
      .withDevWorkspaces({
        workspaces: [
          new DevWorkspaceBuilder()
            .withName('wksp-' + wantDelete[0])
            .withNamespace('user-che')
            .withUID(wantDelete[0])
            .build(),
          new DevWorkspaceBuilder()
            .withName('wksp-' + wantDelete[1])
            .withNamespace('user-che')
            .withUID(wantDelete[1])
            .build(),
        ],
      })
      .build();

    jest.useFakeTimers();

    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    class MockTabManager extends TabManager {
      public open(url: string): void {
        mockTabManagerOpen(url);
      }
      public replace(url: string): void {
        mockWindowReplace(url);
      }
    }

    container.snapshot();
    container.rebind(TabManager).to(MockTabManager).inSingletonScope();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('confirmation dialog', () => {
    test('show up and accept', async () => {
      renderComponent(store, WorkspaceAction.DELETE_WORKSPACE, wantDelete[0]);

      // get and click confirmation button
      const showConfirmationBtn = screen.getByTestId('test-component-show-confirmation');
      await user.click(showConfirmationBtn);

      // check if confirmation dialog is shown
      expect(screen.queryByTestId('workspace-delete-modal')).toBeInTheDocument();

      // get and click the confirmation button
      const acceptConfirmationBtn = screen.getByTestId('delete-workspace');
      await user.click(acceptConfirmationBtn);

      // check if confirmation dialog is removed
      expect(screen.queryByTestId('workspace-delete-modal')).not.toBeInTheDocument();
    });

    test('show up and decline', async () => {
      renderComponent(store, WorkspaceAction.DELETE_WORKSPACE, wantDelete[0]);

      // get and click confirmation button
      const showConfirmationBtn = screen.getByTestId('test-component-show-confirmation');
      await user.click(showConfirmationBtn);

      // check if confirmation dialog is shown
      expect(screen.queryByTestId('workspace-delete-modal')).toBeInTheDocument();

      // get and click the close button
      const declineConfirmationBtn = screen.getByTestId('close-modal');
      await user.click(declineConfirmationBtn);

      // check if confirmation dialog is removed
      expect(screen.queryByTestId('workspace-delete-modal')).not.toBeInTheDocument();
    });
  });

  describe('handle actions', () => {
    describe('delete workspace', () => {
      test('succeeded (with debouncing)', async () => {
        console.warn = jest.fn();

        mockDeleteWorkspace.mockResolvedValue(undefined);

        renderComponent(store, WorkspaceAction.DELETE_WORKSPACE, wantDelete[0]);

        // get and click delete button
        const handleActionBtn = screen.getByTestId('test-component-handle-action');

        // try to delete the workspace tree times in a row
        Promise.allSettled([
          user.click(handleActionBtn),
          user.click(handleActionBtn),
          user.click(handleActionBtn),
        ]);

        // make sure all timers are executed
        await jest.runAllTimersAsync();

        // check if workspace is added to the toDelete list
        expect(await screen.findByTestId('test-component-to-delete')).toHaveTextContent('1234');

        // workspace deletion is debounced, so it called only once
        expect(mockDeleteWorkspace).toHaveBeenCalledTimes(1);
        // two more warnings are expected
        expect(console.warn).toHaveBeenCalledTimes(2);

        expect(mockDeleteWorkspace).toHaveBeenCalledWith(
          expect.objectContaining({ uid: wantDelete[0] }),
        );
      });

      test('failed', async () => {
        mockDeleteWorkspace.mockRejectedValue('workspace deletion failed');

        renderComponent(store, WorkspaceAction.DELETE_WORKSPACE, wantDelete[0]);

        // get and click delete button
        const handleActionBtn = screen.getByTestId('test-component-handle-action');

        await user.click(handleActionBtn);

        // make sure all timers are executed
        await jest.advanceTimersByTimeAsync(1000);

        expect(mockDeleteWorkspace).toHaveBeenCalled();

        expect(mockDeleteWorkspace).toHaveBeenCalledWith(
          expect.objectContaining({ uid: wantDelete[0] }),
        );

        expect(mockHandleAction).toHaveBeenCalledTimes(1);
        expect(mockHandleAction).rejects.toMatch('workspace deletion failed');
      });
    });

    test('open workspace', async () => {
      renderComponent(store, WorkspaceAction.OPEN_IDE, wantDelete[0]);

      // get and click start button
      const handleActionBtn = screen.getByTestId('test-component-handle-action');

      await user.click(handleActionBtn);

      // make sure all timers are executed
      await jest.advanceTimersByTimeAsync(1000);

      expect(mockTabManagerOpen).toHaveBeenCalledTimes(1);
      expect(mockTabManagerOpen).toHaveBeenCalledWith('http://localhost/#/ide/user-che/wksp-1234');
    });

    test('open workspace details', async () => {
      renderComponent(store, WorkspaceAction.WORKSPACE_DETAILS, '1234');

      // get and click start button
      const handleActionBtn = screen.getByTestId('test-component-handle-action');

      await user.click(handleActionBtn);

      // make sure all timers are executed
      await jest.advanceTimersByTimeAsync(1000);

      expect(mockWindowReplace).toHaveBeenCalledTimes(1);
      expect(mockWindowReplace).toHaveBeenCalledWith(
        'http://localhost/#/workspace/user-che/wksp-1234',
      );
    });

    test('start debug and open logs', async () => {
      mockStartWorkspace.mockResolvedValueOnce(undefined);

      renderComponent(store, WorkspaceAction.START_DEBUG_AND_OPEN_LOGS, wantDelete[1]);

      // get and click start button
      const handleActionBtn = screen.getByTestId('test-component-handle-action');

      await user.click(handleActionBtn);

      // make sure all timers are executed
      await jest.advanceTimersByTimeAsync(1000);

      expect(mockStartWorkspace).toHaveBeenCalledTimes(1);
      expect(mockStartWorkspace).toHaveBeenCalledWith(
        expect.objectContaining({ uid: wantDelete[1] }),
        { 'debug-workspace-start': true },
      );

      expect(mockTabManagerOpen).toHaveBeenCalledWith(
        'http://localhost/#/ide/user-che/wksp-5678?tab=Logs',
      );
    });

    test('start in background', async () => {
      mockStartWorkspace.mockResolvedValueOnce(undefined);

      renderComponent(store, WorkspaceAction.START_IN_BACKGROUND, wantDelete[0]);

      // get and click start button
      const handleActionBtn = screen.getByTestId('test-component-handle-action');

      await user.click(handleActionBtn);

      // make sure all timers are executed
      await jest.advanceTimersByTimeAsync(1000);

      expect(mockStartWorkspace).toHaveBeenCalledTimes(1);
      expect(mockStartWorkspace).toHaveBeenCalledWith(
        expect.objectContaining({ uid: wantDelete[0] }),
      );
    });

    test('stop workspace', async () => {
      mockStopWorkspace.mockResolvedValueOnce(undefined);

      renderComponent(store, WorkspaceAction.STOP_WORKSPACE, wantDelete[0]);

      // get and click stop button
      const handleActionBtn = screen.getByTestId('test-component-handle-action');

      await user.click(handleActionBtn);

      // make sure all timers are executed
      await jest.advanceTimersByTimeAsync(1000);

      expect(mockStopWorkspace).toHaveBeenCalledTimes(1);
      expect(mockStopWorkspace).toHaveBeenCalledWith(
        expect.objectContaining({ uid: wantDelete[0] }),
      );
    });

    test('restart workspace', async () => {
      mockDeleteWorkspace.mockResolvedValueOnce(undefined);

      renderComponent(store, WorkspaceAction.RESTART_WORKSPACE, wantDelete[0]);

      // get and click delete button
      const handleActionBtn = screen.getByTestId('test-component-handle-action');

      await user.click(handleActionBtn);

      // make sure all timers are executed
      await jest.advanceTimersByTimeAsync(1000);

      expect(mockRestartWorkspace).toHaveBeenCalledTimes(1);
      expect(mockRestartWorkspace).toHaveBeenCalledWith(
        expect.objectContaining({ uid: wantDelete[0] }),
      );
    });
  });
});

export function getComponent(
  store: Store,
  action: WorkspaceAction,
  uid: string,
): React.ReactElement {
  const history = createMemoryHistory();

  const buildHelperComponent = (context: ActionContextType) => {
    mockHandleAction.mockImplementation(async () => {
      await context.handleAction(action, uid);
    });

    const handleShowConfirmation = async () => {
      try {
        await context.showConfirmation(wantDelete);
      } catch (e) {
        // no-op
      }
    };
    const handleAction = async () => {
      try {
        await mockHandleAction();
      } catch (e) {
        // no-op
      }
    };

    return (
      <div data-testid="test-component">
        {context.toDelete.map(uid => (
          <span key={uid} data-testid="test-component-to-delete">
            {uid}
          </span>
        ))}
        <button
          data-testid="test-component-show-confirmation"
          onClick={() => handleShowConfirmation()}
        >
          showConfirmation
        </button>
        <button data-testid="test-component-handle-action" onClick={() => handleAction()}>
          handleAction
        </button>
      </div>
    );
  };

  return (
    <Provider store={store}>
      <WorkspaceActionsProvider history={history}>
        <WorkspaceActionsConsumer>{buildHelperComponent}</WorkspaceActionsConsumer>
      </WorkspaceActionsProvider>
    </Provider>
  );
}
