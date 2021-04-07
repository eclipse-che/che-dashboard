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

import { createHashHistory } from 'history';
import { Provider } from 'react-redux';
import { render, screen, waitFor } from '@testing-library/react';
import { Store } from 'redux';
import createMockStore from 'redux-mock-store';
import React from 'react';
import thunk from 'redux-thunk';
import { AppState } from '../../../store';
import GetStarted from '..';

const createWorkspaceFromDevfileMock = jest.fn().mockResolvedValue(undefined);
const startWorkspaceMock = jest.fn().mockResolvedValue(undefined);

const dummyDevfile = {
  apiVersion: '1.0.0',
  metadata: {
    generateName: 'wksp-'
  },
} as che.WorkspaceDevfile;

jest.mock('../../../store/Workspaces/index', () => {
  return {
    actionCreators: {
      createWorkspaceFromDevfile: (devfile, namespace, infrastructureNamespace, attributes) =>
        async (): Promise<che.Workspace> => {
          createWorkspaceFromDevfileMock(devfile, namespace, infrastructureNamespace, attributes);
          return { id: 'id-wksp-test', attributes, namespace, devfile: dummyDevfile, temporary: false, status: 'STOPPED' };
        },
      startWorkspace: workspace => async (): Promise<void> => {
        startWorkspaceMock(workspace);
      },
    },
  };
});

jest.mock('../GetStartedTab', () => {
  return function DummyTab(props: {
    onDevfile: (devfileContent: string, stackName: string) => Promise<void>
  }): React.ReactElement {
    return (
      <span>
        Samples List Tab Content
        <button onClick={() => {
          props.onDevfile(
            JSON.stringify(dummyDevfile),
            'dummyStackName',
          );
        }}>Dummy Devfile</button>
      </span>);
  };
});
jest.mock('../CustomWorkspaceTab', () => {
  return function DummyTab(): React.ReactNode {
    return <span>Custom Workspace Tab Content</span>;
  };
});

describe('Get Started page', () => {

  it('should create and start a new workspace', async () => {
    renderGetStartedPage();

    const getStartedTabButton = screen.getByRole('button', { name: 'Get Started' });
    getStartedTabButton.click();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Dummy Devfile' })).toBeTruthy());

    const devfileButton = screen.getByRole('button', { name: 'Dummy Devfile' });
    devfileButton.click();

    expect(createWorkspaceFromDevfileMock).toHaveBeenCalledWith(dummyDevfile, undefined, undefined, { stackName: 'dummyStackName' });
  });

  it('should have correct masthead when Get Started tab is active', () => {
    renderGetStartedPage();
    const masthead = screen.getByRole('heading');

    const getStartedTabButton = screen.getByRole('button', { name: 'Get Started' });
    getStartedTabButton.click();

    expect(masthead.textContent?.startsWith('Getting Started with'));
  });

  it('should have correct masthead when Custom Workspace tab is active', () => {
    renderGetStartedPage();
    const masthead = screen.getByRole('heading');

    const customWorkspaceTabButton = screen.getByRole('button', { name: 'Custom Workspace' });
    customWorkspaceTabButton.click();

    expect(masthead.textContent?.startsWith('Create Custom Workspace'));
  });

});

function renderGetStartedPage(): void {
  const store = createFakeStore();
  const history = createHashHistory();
  render(
    <Provider store={store}>
      <GetStarted history={history} />
    </Provider>
  );
}

function createFakeStore(): Store {
  const initialState: AppState = {
    factoryResolver: {
      isLoading: false,
      resolver: {},
    },
    plugins: {
      isLoading: false,
      plugins: [],
    },
    workspaces: {
      workspaces: [],
      settings: {}
    } as any,
    branding: {
      data: {
        name: 'test'
      },
    } as any,
    devfileRegistries: {} as any,
    user: {} as any,
    userProfile: {} as any,
    infrastructureNamespace: {} as any,
    userPreferences: {} as any,
    dwPlugins: {} as any,
  };
  const middleware = [thunk];
  const mockStore = createMockStore(middleware);
  return mockStore(initialState);
}
