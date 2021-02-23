/*
 * Copyright (c) 2018-2020 Red Hat, Inc.
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
import { Provider } from 'react-redux';
import { AlertVariant } from '@patternfly/react-core';
import { RenderResult, render, screen, waitFor } from '@testing-library/react';
import { ROUTE } from '../../route.enum';
import { getMockRouterProps } from '../../services/__mocks__/router';
import { FakeStoreBuilder } from '../../store/__mocks__/storeBuilder';
import { createFakeWorkspace } from '../../store/__mocks__/workspace';
import { WorkspaceStatus } from '../../services/helpers/types';
import FactoryLoaderContainer, { LoadFactorySteps } from '../FactoryLoader';
import { AlertOptions } from '../../pages/IdeLoader';

const showAlertMock = jest.fn();
const createWorkspaceFromDevfileMock = jest.fn().mockResolvedValue(undefined);
const requestWorkspaceMock = jest.fn().mockResolvedValue(undefined);
const startWorkspaceMock = jest.fn().mockResolvedValue(undefined);
const requestFactoryResolverMock = jest.fn().mockResolvedValue(undefined);
const setWorkspaceIdMock = jest.fn().mockResolvedValue(undefined);
const clearWorkspaceIdMock = jest.fn().mockResolvedValue(undefined);

jest.mock('../../store/Workspaces/index', () => {
  return {
    actionCreators: {
      requestWorkspace: (id) => async (): Promise<void> => {
        requestWorkspaceMock(id);
      },
      startWorkspace: (id) => async (): Promise<void> => {
        startWorkspaceMock(id);
      },
      createWorkspaceFromDevfile: (devfile, namespace, infrastructureNamespace, attributes) =>
        async (): Promise<che.Workspace> => {
          createWorkspaceFromDevfileMock(devfile, namespace, infrastructureNamespace, attributes);
          jest.runOnlyPendingTimers();
          return { id: 'id-wksp-test', attributes, namespace, devfile, temporary: false, status: 'STOPPED' };
        },
      setWorkspaceId: (id) => async (): Promise<void> => {
        setWorkspaceIdMock(id);
      },
      clearWorkspaceId: () => async (): Promise<void> => {
        clearWorkspaceIdMock();
      },
    },
  };
});

jest.mock('../../store/FactoryResolver', () => {
  return {
    actionCreators: {
      requestFactoryResolver: location => async (): Promise<void> => {
        requestFactoryResolverMock(location);
      }
    }
  };
});

jest.mock('../../pages/FactoryLoader', () => {
  return function DummyWizard(props: {
    hasError: boolean,
    currentStep: LoadFactorySteps,
    workspaceName: string;
    workspaceId: string;
    devfileLocationInfo?: string;
    callbacks?: {
      showAlert?: (alertOptions: AlertOptions) => void
    }
  }): React.ReactElement {
    if (props.callbacks) {
      props.callbacks.showAlert = showAlertMock;
    }
    return (<div>Dummy Wizard
      <div data-testid="factory-loader-has-error">{props.hasError.toString()}</div>
      <div data-testid="factory-loader-current-step">{props.currentStep}</div>
      <div data-testid="factory-loader-workspace-name">{props.workspaceName}</div>
      <div data-testid="factory-loader-workspace-id">{props.workspaceId}</div>
      <div data-testid="factory-loader-devfile-location-info">{props.devfileLocationInfo}</div>
    </div>);
  };
});

describe('Factory Loader container', () => {

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should resolve the factory, create and start a new workspace', async () => {
    const location = 'http://test-location';
    const workspace = createFakeWorkspace('wrksp-test-id', 'wrksp-test-name');

    renderComponent(location, workspace);

    const elementCurrentStep = screen.getByTestId('factory-loader-current-step');

    await waitFor(() => expect(clearWorkspaceIdMock).toHaveBeenCalled());
    expect(LoadFactorySteps[elementCurrentStep.innerHTML]).toEqual(LoadFactorySteps[LoadFactorySteps.LOOKING_FOR_DEVFILE]);

    jest.runOnlyPendingTimers();
    await waitFor(() => expect(requestFactoryResolverMock).toHaveBeenCalledWith(location));
    expect(LoadFactorySteps[elementCurrentStep.innerHTML]).toEqual(LoadFactorySteps[LoadFactorySteps.APPLYING_DEVFILE]);

    jest.runOnlyPendingTimers();
    await waitFor(() =>
      expect(createWorkspaceFromDevfileMock).toHaveBeenCalledWith(workspace.devfile, undefined, undefined, { stackName: location + '/' }));

    jest.runOnlyPendingTimers();
    expect(showAlertMock).not.toHaveBeenCalled();
    await waitFor(() => expect(requestWorkspaceMock).toHaveBeenCalledWith(workspace.id));
    await waitFor(() => expect(startWorkspaceMock).toHaveBeenCalledWith(workspace.id));
    expect(LoadFactorySteps[elementCurrentStep.innerHTML]).toEqual(LoadFactorySteps[LoadFactorySteps.START_WORKSPACE]);
  });

  it('should resolve the factory, create a new workspace and open IDE', async () => {
    const location = 'http://test-location';
    const workspace = createFakeWorkspaceWithRuntime('id-wksp-test');

    renderComponent(location, workspace);

    const elementCurrentStep = screen.getByTestId('factory-loader-current-step');

    await waitFor(() => expect(clearWorkspaceIdMock).toHaveBeenCalled());
    expect(LoadFactorySteps[elementCurrentStep.innerHTML]).toEqual(LoadFactorySteps[LoadFactorySteps.LOOKING_FOR_DEVFILE]);

    jest.runOnlyPendingTimers();
    await waitFor(() => expect(requestFactoryResolverMock).toHaveBeenCalledWith(location));
    expect(LoadFactorySteps[elementCurrentStep.innerHTML]).toEqual(LoadFactorySteps[LoadFactorySteps.APPLYING_DEVFILE]);

    jest.runOnlyPendingTimers();
    await waitFor(() =>
      expect(createWorkspaceFromDevfileMock).toHaveBeenCalledWith(workspace.devfile, undefined, undefined, { stackName: location + '/' }));

    jest.runOnlyPendingTimers();
    expect(showAlertMock).toBeCalledWith(
      AlertVariant.warning,
      'You\'re starting an ephemeral workspace. All changes to the source code will be lost ' +
      'when the workspace is stopped unless they are pushed to a remote code repository.'
    );
    expect(setWorkspaceIdMock).toHaveBeenCalledWith(workspace.id);
    await waitFor(() => expect(requestWorkspaceMock).toHaveBeenCalledWith(workspace.id));
    await waitFor(() => expect(startWorkspaceMock).not.toHaveBeenCalled());

    jest.runOnlyPendingTimers();
    await waitFor(() => expect(requestWorkspaceMock).toHaveBeenCalledWith(workspace.id));
    expect(LoadFactorySteps[elementCurrentStep.innerHTML]).toEqual(LoadFactorySteps[LoadFactorySteps.OPEN_IDE]);
  });

  it('should resolve the factory, create a new workspace with param overriding', async () => {
    const location = 'http://test-location&override.metadata.generateName=testPrefix';
    const workspace = createFakeWorkspaceWithRuntime('id-wksp-test', location);
    renderComponent(location, workspace);

    const elementCurrentStep = screen.getByTestId('factory-loader-current-step');
    expect(LoadFactorySteps[elementCurrentStep.innerHTML]).toEqual(LoadFactorySteps[LoadFactorySteps.LOOKING_FOR_DEVFILE]);

    jest.runOnlyPendingTimers();
    await waitFor(() => expect(requestFactoryResolverMock).toHaveBeenCalledWith(location.split('&')[0]));
    expect(LoadFactorySteps[elementCurrentStep.innerHTML]).toEqual(LoadFactorySteps[LoadFactorySteps.APPLYING_DEVFILE]);

    jest.runOnlyPendingTimers();
    await waitFor(() =>
      expect(createWorkspaceFromDevfileMock).toHaveBeenCalledWith(
        {
          apiVersion: '1.0.0',
          metadata: {
            name: 'name-wksp-2',
            generateName: 'testPrefix'
          },
          attributes: { persistVolumes: 'false' }
        }, undefined, undefined,
        { stackName: 'http://test-location/?override.metadata.generateName=testPrefix' }));
  });

  it('should resolve the factory with \'policies.create=peruser\'', async () => {
    const location = 'http://test-location&policies.create=peruser';
    const workspace = createFakeWorkspaceWithRuntime('id-wksp-test', 'http://test-location/?policies.create=peruser');

    renderComponent(location, workspace);

    const elementCurrentStep = screen.getByTestId('factory-loader-current-step');
    expect(LoadFactorySteps[elementCurrentStep.innerHTML]).toEqual(LoadFactorySteps[LoadFactorySteps.LOOKING_FOR_DEVFILE]);

    jest.runOnlyPendingTimers();
    await waitFor(() => expect(requestFactoryResolverMock).toHaveBeenCalledWith(location.split('&')[0]));
    expect(LoadFactorySteps[elementCurrentStep.innerHTML]).toEqual(LoadFactorySteps[LoadFactorySteps.APPLYING_DEVFILE]);

    jest.runOnlyPendingTimers();
    expect(createWorkspaceFromDevfileMock).not.toHaveBeenCalled();

    jest.runOnlyPendingTimers();
    await waitFor(() => expect(requestWorkspaceMock).toHaveBeenCalledWith(workspace.id));
    expect(LoadFactorySteps[elementCurrentStep.innerHTML]).toEqual(LoadFactorySteps[LoadFactorySteps.OPEN_IDE]);
  });

  it('should show an error if something wrong with Repository/Devfile URL', async () => {
    const message = 'Repository/Devfile URL is missing. Please specify it via url query param: ' +
      window.location.origin + window.location.pathname + '#/load-factory?url= .';
    const workspace = createFakeWorkspaceWithRuntime('id-wksp-test');
    renderComponent('', workspace);

    expect(requestFactoryResolverMock).not.toBeCalled();
    await waitFor(() => expect(showAlertMock).toBeCalledWith(AlertVariant.danger, message));
    const elementHasError = screen.getByTestId('factory-loader-has-error');
    expect(elementHasError.innerHTML).toEqual('true');

    const elementCurrentStep = screen.getByTestId('factory-loader-current-step');
    expect(LoadFactorySteps[elementCurrentStep.innerHTML]).toEqual(LoadFactorySteps[LoadFactorySteps.CREATE_WORKSPACE]);
  });
});

function renderComponent(
  url: string,
  workspace: che.Workspace
): RenderResult {
  const store = new FakeStoreBuilder().withWorkspaces({
    workspaces: [workspace],
    workspaceId: workspace.id
  }).withFactoryResolver({
    v: '4.0',
    source: 'devfile.yaml',
    devfile: workspace.devfile as api.che.workspace.devfile.Devfile,
    location: url.split('&')[0],
  }).build();
  const props = getMockRouterProps(ROUTE.LOAD_FACTORY_URL, { url });

  return render(
    <Provider store={store}>
      <FactoryLoaderContainer
        {...props}
      />
    </Provider>,
  );
}

function createFakeWorkspaceWithRuntime(workspaceId: string, stackName = '', workspaceName = 'name-wksp-2'): che.Workspace {
  const workspace = createFakeWorkspace(
    workspaceId,
    workspaceName,
    'namespace',
    WorkspaceStatus[WorkspaceStatus.RUNNING],
    {
      machines: {
        'theia-factory-test': {
          attributes: {
            source: 'tool',
          },
          servers: {
            theia: {
              status: WorkspaceStatus[WorkspaceStatus.RUNNING],
              attributes: {
                type: 'ide',
              },
              url: 'https://dummy-editora-server',
            },
          },
          status: WorkspaceStatus[WorkspaceStatus.RUNNING],
        },
      },
      status: WorkspaceStatus[WorkspaceStatus.RUNNING],
      activeEnv: 'default',
    }
  );
  workspace.devfile.attributes = { persistVolumes: 'false' };
  if (!workspace.attributes) {
    workspace.attributes = {
      infrastructureNamespace: '',
      created: ''
    };
  }
  workspace.attributes.stackName = stackName;

  return workspace;
}
