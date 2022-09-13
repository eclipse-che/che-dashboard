/*
 * Copyright (c) 2018-2021 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import React from 'react';
import { Store } from 'redux';
import { Provider } from 'react-redux';
import { createMemoryHistory } from 'history';
import userEvent from '@testing-library/user-event';
import { screen, waitFor, within } from '@testing-library/react';
import { WorkspaceParams } from '../../../../../../Routes/routes';
import { FakeStoreBuilder } from '../../../../../../store/__mocks__/storeBuilder';
import { DevWorkspaceBuilder } from '../../../../../../store/__mocks__/devWorkspaceBuilder';
import { MIN_STEP_DURATION_MS, TIMEOUT_TO_GET_URL_SEC } from '../../../../const';
import { List, LoaderStep, LoadingStep } from '../../../../../../components/Loader/Step';
import {
  buildLoaderSteps,
  getWorkspaceLoadingSteps,
} from '../../../../../../components/Loader/Step/buildSteps';
import getComponentRenderer from '../../../../../../services/__mocks__/getComponentRenderer';
import StepOpenWorkspace from '..';

jest.mock('../../../../../../pages/Loader/Workspace');

const { renderComponent } = getComponentRenderer(getComponent);

const mockOnNextStep = jest.fn();
const mockOnRestart = jest.fn();

const mockLocationReplace = jest.fn();

const namespace = 'che-user';
const workspaceName = 'test-workspace';
const matchParams: WorkspaceParams = {
  namespace,
  workspaceName,
};

const stepId = LoadingStep.OPEN_WORKSPACE.toString();
const currentStepIndex = 3;
const loadingSteps = getWorkspaceLoadingSteps();

describe('Workspace Loader, step OPEN_WORKSPACE', () => {
  let loaderSteps: List<LoaderStep>;

  beforeEach(() => {
    delete (window as any).location;
    (window.location as any) = { replace: mockLocationReplace };

    loaderSteps = buildLoaderSteps(loadingSteps);

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  test('workspace not found', async () => {
    const wrongWorkspaceName = 'wrong-workspace-name';
    const store = new FakeStoreBuilder()
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

    const paramsWithWrongName: WorkspaceParams = {
      namespace,
      workspaceName: wrongWorkspaceName,
    };
    renderComponent(store, loaderSteps, paramsWithWrongName);

    jest.advanceTimersByTime(MIN_STEP_DURATION_MS);

    const currentStepId = screen.getByTestId('current-step-id');
    await waitFor(() => expect(currentStepId.textContent).toEqual(stepId));

    const currentStep = screen.getByTestId(stepId);
    const hasError = within(currentStep).getByTestId('hasError');
    expect(hasError.textContent).toEqual('true');

    const alertTitle = screen.getByTestId('alert-title');
    expect(alertTitle.textContent).toEqual('Failed to open the workspace');

    const alertBody = screen.getByTestId('alert-body');
    expect(alertBody.textContent).toEqual(
      `Workspace "${namespace}/${wrongWorkspaceName}" not found.`,
    );

    expect(mockOnNextStep).not.toHaveBeenCalled();
  });

  test('workspace is RUNNING', async () => {
    const store = new FakeStoreBuilder()
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

    renderComponent(store, loaderSteps);

    jest.advanceTimersByTime(MIN_STEP_DURATION_MS);

    const currentStepId = screen.getByTestId('current-step-id');
    await waitFor(() => expect(currentStepId.textContent).toEqual(stepId));

    jest.advanceTimersByTime(5000);

    // wait for opening IDE url
    await waitFor(() => expect(mockLocationReplace).toHaveBeenCalledWith('main-url'));
  });

  test(`workspace is RUNNING and mainUrl is not propagated more than TIMEOUT_TO_GET_URL_SEC seconds`, async () => {
    const store = new FakeStoreBuilder()
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

    renderComponent(store, loaderSteps);

    const currentStepId = screen.getByTestId('current-step-id');
    await waitFor(() => expect(currentStepId.textContent).toEqual(stepId));

    const currentStep = screen.getByTestId(stepId);

    // initially no errors
    const hasError = within(currentStep).getByTestId('hasError');
    await waitFor(() => expect(hasError.textContent).toEqual('false'));

    // wait a bit more than necessary to end the timeout
    const time = (TIMEOUT_TO_GET_URL_SEC + 1) * 1000;
    jest.advanceTimersByTime(time);

    // there should be the error message
    await waitFor(() => expect(hasError.textContent).toEqual('true'));

    const alertTitle = screen.getByTestId('alert-title');
    expect(alertTitle.textContent).toEqual('Failed to open the workspace');

    const alertBody = screen.getByTestId('alert-body');
    expect(alertBody.textContent).toEqual(
      'The workspace has not received an IDE URL in the last 20 seconds. Try to re-open the workspace.',
    );
  });

  test(`workspace is RUNNING and mainUrl is propagated within TIMEOUT_TO_GET_URL_SEC seconds`, async () => {
    const store = new FakeStoreBuilder()
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

    const { reRenderComponent } = renderComponent(store, loaderSteps);

    jest.advanceTimersByTime(MIN_STEP_DURATION_MS);

    const currentStepId = screen.getByTestId('current-step-id');
    await waitFor(() => expect(currentStepId.textContent).toEqual(stepId));

    // wait less than necessary to end the timeout
    const time = (TIMEOUT_TO_GET_URL_SEC - 1) * 1000;
    jest.advanceTimersByTime(time);

    const currentStep = screen.getByTestId(stepId);

    // no errors at this moment
    const hasError = within(currentStep).getByTestId('hasError');
    expect(hasError.textContent).toEqual('false');

    const nextStore = new FakeStoreBuilder()
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
    reRenderComponent(nextStore, loaderSteps);

    jest.advanceTimersByTime(MIN_STEP_DURATION_MS);

    // wait for opening IDE url
    await waitFor(() => expect(mockLocationReplace).toHaveBeenCalledWith('main-url'));
  });

  test('workspace is FAILING', async () => {
    const store = new FakeStoreBuilder()
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

    renderComponent(store, loaderSteps);

    jest.advanceTimersByTime(MIN_STEP_DURATION_MS);

    const currentStepId = screen.getByTestId('current-step-id');
    await waitFor(() => expect(currentStepId.textContent).toEqual(stepId));

    const currentStep = screen.getByTestId(stepId);

    // should report the error
    const hasError = within(currentStep).getByTestId('hasError');
    expect(hasError.textContent).toEqual('true');

    const alertTitle = screen.getByTestId('alert-title');
    expect(alertTitle.textContent).toEqual('Failed to open the workspace');

    const alertBody = screen.getByTestId('alert-body');
    expect(alertBody.textContent).toEqual(
      'The workspace status changed unexpectedly to "Failing".',
    );
  });

  test('restart flow', async () => {
    const store = new FakeStoreBuilder()
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

    renderComponent(store, loaderSteps);

    jest.advanceTimersByTime(MIN_STEP_DURATION_MS);

    const restartButton = await screen.findByRole('button', {
      name: 'Restart',
    });
    userEvent.click(restartButton);

    expect(mockOnRestart).toHaveBeenCalled();
  });
});

function getComponent(
  store: Store,
  loaderSteps: List<LoaderStep>,
  params: { namespace: string; workspaceName: string } = matchParams,
): React.ReactElement {
  const history = createMemoryHistory();
  return (
    <Provider store={store}>
      <StepOpenWorkspace
        currentStepIndex={currentStepIndex}
        history={history}
        loaderSteps={loaderSteps}
        matchParams={params}
        tabParam={undefined}
        onNextStep={mockOnNextStep}
        onRestart={mockOnRestart}
      />
    </Provider>
  );
}
