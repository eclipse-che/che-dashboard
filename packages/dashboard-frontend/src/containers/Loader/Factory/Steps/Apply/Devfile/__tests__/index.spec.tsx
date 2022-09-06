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
import { Action, Store } from 'redux';
import { Provider } from 'react-redux';
import { screen, waitFor, within } from '@testing-library/react';
import { dump } from 'js-yaml';
import { createMemoryHistory, MemoryHistory } from 'history';
import { ROUTE } from '../../../../../../../Routes/routes';
import { FakeStoreBuilder } from '../../../../../../../store/__mocks__/storeBuilder';
import { DevWorkspaceBuilder } from '../../../../../../../store/__mocks__/devWorkspaceBuilder';
import { ActionCreators } from '../../../../../../../store/Workspaces';
import { AppThunk } from '../../../../../../../store';
import { List, LoaderStep, LoadingStep } from '../../../../../../../components/Loader/Step';
import {
  buildLoaderSteps,
  getFactoryLoadingSteps,
} from '../../../../../../../components/Loader/Step/buildSteps';
import { DEVWORKSPACE_DEVFILE_SOURCE } from '../../../../../../../services/workspace-client/devworkspace/devWorkspaceClient';
import devfileApi from '../../../../../../../services/devfileApi';
import getComponentRenderer from '../../../../../../../services/__mocks__/getComponentRenderer';
import StepApplyDevfile, { State } from '..';
import {
  FACTORY_URL_ATTR,
  MIN_STEP_DURATION_MS,
  TIMEOUT_TO_CREATE_SEC,
} from '../../../../../const';
import userEvent from '@testing-library/user-event';
import { StateMock } from '@react-mock/state';
import buildFactoryParams from '../../../../buildFactoryParams';

jest.mock('../../../../../../../pages/Loader/Factory');

const mockCreateWorkspaceFromDevfile = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../../../../../store/Workspaces/index', () => {
  return {
    actionCreators: {
      createWorkspaceFromDevfile:
        (
          ...args: Parameters<ActionCreators['createWorkspaceFromDevfile']>
        ): AppThunk<Action, Promise<void>> =>
        async (): Promise<void> =>
          mockCreateWorkspaceFromDevfile(...args),
    } as ActionCreators,
  };
});

const { renderComponent } = getComponentRenderer(getComponent);
let history: MemoryHistory;

const mockOnNextStep = jest.fn();
const mockOnRestart = jest.fn();

const stepId = LoadingStep.CREATE_WORKSPACE__APPLY_DEVFILE.toString();
const currentStepIndex = 4;
const loadingSteps = getFactoryLoadingSteps('devfile');

const factoryUrl = 'https://factory-url';

describe('Factory Loader container, step CREATE_WORKSPACE__APPLYING_DEVFILE', () => {
  let searchParams: URLSearchParams;
  let loaderSteps: List<LoaderStep>;

  beforeEach(() => {
    history = createMemoryHistory({
      initialEntries: [ROUTE.FACTORY_LOADER],
    });

    searchParams = new URLSearchParams({
      [FACTORY_URL_ATTR]: factoryUrl,
    });
    loaderSteps = buildLoaderSteps(loadingSteps);

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  test('restart flow', async () => {
    const localState: Partial<State> = {
      lastError: new Error('Unexpected error'),
      factoryParams: buildFactoryParams(searchParams),
    };
    const store = new FakeStoreBuilder().build();
    renderComponent(store, loaderSteps, searchParams, currentStepIndex, localState);

    jest.advanceTimersByTime(MIN_STEP_DURATION_MS);

    const restartButton = await screen.findByRole('button', {
      name: 'Click to try again',
    });
    expect(restartButton).toBeDefined();
    userEvent.click(restartButton);

    expect(mockOnRestart).toHaveBeenCalled();
  });

  test('workspace is already created', async () => {
    const factorySource = {
      factory: {
        params: `url=${factoryUrl}`,
      },
    };
    const store = new FakeStoreBuilder()
      .withDevWorkspaces({
        workspaces: [
          new DevWorkspaceBuilder()
            .withName('my-project')
            .withNamespace('user-che')
            .withMetadata({
              annotations: {
                [DEVWORKSPACE_DEVFILE_SOURCE]: dump(factorySource),
              },
            })
            .build(),
        ],
      })
      .build();

    renderComponent(store, loaderSteps, searchParams, currentStepIndex);

    jest.advanceTimersByTime(MIN_STEP_DURATION_MS);

    const currentStepId = screen.getByTestId('current-step-id');
    await waitFor(() => expect(currentStepId.textContent).toEqual(stepId));

    const currentStep = screen.getByTestId(stepId);
    const hasError = within(currentStep).getByTestId('hasError');
    expect(hasError.textContent).toEqual('false');

    await waitFor(() => expect(mockOnNextStep).toHaveBeenCalled());
    expect(history.location.pathname).toEqual('/ide/user-che/my-project');
  });

  test('factory url is not resolved', async () => {
    const store = new FakeStoreBuilder().build();
    renderComponent(store, loaderSteps, searchParams, currentStepIndex);

    jest.advanceTimersByTime(MIN_STEP_DURATION_MS);

    const currentStepId = screen.getByTestId('current-step-id');
    await waitFor(() => expect(currentStepId.textContent).toEqual(stepId));

    const currentStep = screen.getByTestId(stepId);
    const hasError = within(currentStep).getByTestId('hasError');
    expect(hasError.textContent).toEqual('true');

    const alertTitle = screen.getByTestId('alert-title');
    expect(alertTitle.textContent).toEqual('Failed to create the workspace');

    const alertBody = screen.getByTestId('alert-body');
    expect(alertBody.textContent).toEqual('Failed to resolve the devfile.');

    // stay on the factory loader page
    expect(history.location.pathname).toContain('/load-factory');
    expect(mockOnNextStep).not.toHaveBeenCalled();
  });

  test('the workspace took more than TIMEOUT_TO_CREATE_SEC to create', async () => {
    const store = new FakeStoreBuilder()
      .withFactoryResolver({
        converted: {
          devfileV2: {
            schemaVersion: '2.1.0',
            metadata: {
              name: 'my-project',
            },
          } as devfileApi.Devfile,
        },
      })
      .build();

    renderComponent(store, loaderSteps, searchParams, currentStepIndex);

    jest.advanceTimersByTime(MIN_STEP_DURATION_MS);

    const currentStepId = screen.getByTestId('current-step-id');
    await waitFor(() => expect(currentStepId.textContent).toEqual(stepId));

    const currentStep = screen.getByTestId(stepId);
    const hasError = within(currentStep).getByTestId('hasError');
    expect(hasError.textContent).toEqual('false');

    await waitFor(() => expect(mockCreateWorkspaceFromDevfile).toHaveBeenCalled());

    // stay on the factory loader page
    expect(history.location.pathname).toContain('/load-factory');
    expect(mockOnNextStep).not.toHaveBeenCalled();

    // wait a bit more than necessary to end the workspace creating timeout
    const time = (TIMEOUT_TO_CREATE_SEC + 1) * 1000;
    jest.advanceTimersByTime(time);

    await waitFor(() => expect(hasError.textContent).toEqual('true'));

    const alertTitle = screen.getByTestId('alert-title');
    expect(alertTitle.textContent).toEqual('Failed to create the workspace');

    const alertBody = screen.getByTestId('alert-body');
    expect(alertBody.textContent).toEqual(
      `Workspace hasn't been created in the last ${TIMEOUT_TO_CREATE_SEC} seconds.`,
    );

    // stay on the factory loader page
    expect(history.location.pathname).toContain('/load-factory');
    expect(mockOnNextStep).not.toHaveBeenCalled();
  });

  test('the workspace created successfully', async () => {
    const store = new FakeStoreBuilder()
      .withFactoryResolver({
        converted: {
          devfileV2: {
            schemaVersion: '2.1.0',
            metadata: {
              name: 'my-project',
            },
          } as devfileApi.Devfile,
        },
      })
      .build();

    const { reRenderComponent } = renderComponent(
      store,
      loaderSteps,
      searchParams,
      currentStepIndex,
    );

    jest.advanceTimersByTime(MIN_STEP_DURATION_MS);

    const currentStepId = screen.getByTestId('current-step-id');
    await waitFor(() => expect(currentStepId.textContent).toEqual(stepId));

    const currentStep = screen.getByTestId(stepId);
    const hasError = within(currentStep).getByTestId('hasError');
    expect(hasError.textContent).toEqual('false');

    await waitFor(() => expect(mockCreateWorkspaceFromDevfile).toHaveBeenCalled());

    // stay on the factory loader page
    expect(history.location.pathname).toContain('/load-factory');
    expect(mockOnNextStep).not.toHaveBeenCalled();

    // wait a bit less than necessary to end the workspace creating timeout
    const time = (TIMEOUT_TO_CREATE_SEC - 1) * 1000;
    jest.advanceTimersByTime(time);

    // build next store
    const factorySource = {
      factory: {
        params: `url=${factoryUrl}`,
      },
    };
    const nextStore = new FakeStoreBuilder()
      .withFactoryResolver({
        converted: {
          devfileV2: {
            schemaVersion: '2.1.0',
            metadata: {
              name: 'my-project',
            },
          } as devfileApi.Devfile,
        },
      })
      .withDevWorkspaces({
        workspaces: [
          new DevWorkspaceBuilder()
            .withName('my-project')
            .withNamespace('user-che')
            .withMetadata({
              annotations: {
                [DEVWORKSPACE_DEVFILE_SOURCE]: dump(factorySource),
              },
            })
            .build(),
        ],
      })
      .build();
    reRenderComponent(nextStore, loaderSteps, searchParams, currentStepIndex);

    jest.advanceTimersByTime(MIN_STEP_DURATION_MS);

    await waitFor(() => expect(mockOnNextStep).toHaveBeenCalled());
    expect(history.location.pathname).toEqual('/ide/user-che/my-project');

    expect(hasError.textContent).toEqual('false');
  });
});

function getComponent(
  store: Store,
  loaderSteps: List<LoaderStep>,
  searchParams: URLSearchParams,
  stepIndex = currentStepIndex,
  localState?: Partial<State>,
): React.ReactElement {
  const component = (
    <StepApplyDevfile
      searchParams={searchParams}
      currentStepIndex={stepIndex}
      history={history}
      loaderSteps={loaderSteps}
      tabParam={undefined}
      onNextStep={mockOnNextStep}
      onRestart={mockOnRestart}
    />
  );
  if (localStorage) {
    return (
      <Provider store={store}>
        <StateMock state={localState}>{component}</StateMock>
      </Provider>
    );
  } else {
    return <Provider store={store}>{component}</Provider>;
  }
}
