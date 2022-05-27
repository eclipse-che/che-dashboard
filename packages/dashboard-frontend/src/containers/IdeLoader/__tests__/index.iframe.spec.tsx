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
import { Provider } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { Store } from 'redux';
import { render, RenderResult, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StateMock } from '@react-mock/state';
import { ROUTE } from '../../../route.enum';
import { getMockRouterProps } from '../../../services/__mocks__/router';
import { FakeStoreBuilder } from '../../../store/__mocks__/storeBuilder';
import { DevWorkspaceBuilder } from '../../../store/__mocks__/devWorkspaceBuilder';
import IdeLoaderContainer, { State } from '..';
import { ToggleBarsContext } from '../../../contexts/ToggleBars';
import { iframeWorkspaceId } from '../../../pages/IdeIframe/__mocks__';

type Props = {
  namespace: string;
  workspaceName: string;
};

jest.mock('../../../pages/IdeIframe');
jest.mock('../../../pages/IdeLoader');

const mockHideAll = jest.fn();
const mockShowAll = jest.fn();

describe('IDE Loader container, IDE in the iframe', () => {
  const namespace = 'che-user';
  const workspaceName = 'test-workspace';
  const mainUrl = 'main-url';
  let store: Store;
  let localState: State;
  let routeProps: RouteComponentProps<Props>;

  beforeEach(() => {
    store = new FakeStoreBuilder()
      .withDevWorkspaces({
        workspaces: [
          new DevWorkspaceBuilder()
            .withId(iframeWorkspaceId)
            .withName(workspaceName)
            .withNamespace(namespace)
            .withStatus({ phase: 'RUNNING', mainUrl })
            .build(),
        ],
      })
      .build();

    localState = {
      shouldStart: true,
      currentStepIndex: 2,
      matchParams: {
        namespace,
        workspaceName,
      },
      ideUrl: mainUrl,
    };

    routeProps = getMockRouterProps(ROUTE.IDE_LOADER, {
      namespace,
      workspaceName,
    });

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  it('should open IDE in iframe', async () => {
    renderComponent(routeProps, store, localState);

    // should render the IDE iframe
    await waitFor(() => expect(screen.queryByTestId('ide-iframe')).toBeTruthy());
  });

  it('should open the workspaces list page', async () => {
    const spyHistoryPush = jest.spyOn(routeProps.history, 'push');

    renderComponent(routeProps, store, localState);

    // wait for iframe to be rendered
    await waitFor(() => expect(screen.queryByTestId('ide-iframe')).toBeTruthy());

    jest.clearAllMocks();

    const openWorkspacesButton = screen.getByRole('button', { name: /open workspaces list/i });
    userEvent.click(openWorkspacesButton);

    expect(mockHideAll).not.toHaveBeenCalled();
    expect(mockShowAll).toHaveBeenCalled();

    // should change location
    expect(spyHistoryPush).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: ROUTE.WORKSPACES,
      }),
    );
  });

  it('should restart the workspace', async () => {
    renderComponent(routeProps, store, localState);

    // wait for iframe to be rendered
    await waitFor(() => expect(screen.queryByTestId('ide-iframe')).toBeTruthy());

    const restartWorkspaceButton = screen.getByRole('button', { name: /restart workspace/i });
    userEvent.click(restartWorkspaceButton);

    // should render the IDE loader page
    await waitFor(() => expect(screen.queryByTestId('ide-loader-page')).toBeTruthy());
  });

  it('should NOT restart the workspace', async () => {
    const wrongWorkspaceId = 'wrong-workspace-id';
    const store = new FakeStoreBuilder()
      .withDevWorkspaces({
        workspaces: [
          new DevWorkspaceBuilder()
            .withId(wrongWorkspaceId)
            .withName(workspaceName)
            .withNamespace(namespace)
            .withStatus({ phase: 'RUNNING', mainUrl })
            .build(),
        ],
      })
      .build();

    renderComponent(routeProps, store, localState);

    // wait for iframe to be rendered
    await waitFor(() => expect(screen.queryByTestId('ide-iframe')).toBeTruthy());

    jest.clearAllMocks();

    const restartWorkspaceButton = screen.getByRole('button', { name: /restart workspace/i });
    userEvent.click(restartWorkspaceButton);

    jest.advanceTimersByTime(5000);

    // should stay on the IDE iframe page
    await waitFor(() => expect(screen.queryByTestId('ide-iframe')).toBeTruthy());
  });
});

function renderComponent(
  routeProps: RouteComponentProps<Props>,
  store: Store,
  localState: State,
): RenderResult {
  return render(
    <Provider store={store}>
      <StateMock state={localState}>
        <ToggleBarsContext.Provider
          value={{
            hideAll: mockHideAll,
            showAll: mockShowAll,
          }}
        >
          <IdeLoaderContainer {...routeProps} />
        </ToggleBarsContext.Provider>
      </StateMock>
    </Provider>,
  );
}
