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

import React, { Suspense } from 'react';
import { Location } from 'history';
import { Provider } from 'react-redux';
import { MemoryRouter, RouteComponentProps } from 'react-router';
import { render, screen, waitFor } from '@testing-library/react';
import Routes from '../';
import { FakeStoreBuilder } from '../../store/__mocks__/storeBuilder';
import Fallback from '../../components/Fallback';
import { ROUTE } from '../../route.enum';
import {
  buildDetailsPath,
  buildFactoryLoaderPath,
  buildGettingStartedPath,
  buildIdeLoaderPath,
  buildWorkspacesPath,
} from '../../services/helpers/location';
import { IdeLoaderTab, WorkspaceDetailsTab } from '../../services/helpers/types';

jest.mock('../../pages/GetStarted', () => {
  return function GetStarted() {
    return (<span>Get Started</span>);
  };
});
jest.mock('../../containers/WorkspacesList.tsx', () => {
  return function WorkspacesList() {
    return (<span>Workspaces List</span>);
  };
});
jest.mock('../../containers/WorkspaceDetails', () => {
  return function WorkspaceDetails() {
    return (<span>Workspace Details</span>);
  };
});
jest.mock('../../containers/IdeLoader', () => {
  return function IdeLoader() {
    return (<span>Ide Loader</span>);
  };
});
jest.mock('../../pages/UserPreferences', () => {
  return function UserPreferences() {
    return (<span>User Preferences</span>);
  };
});
jest.mock('../../pages/UserAccount', () => {
  return function UserPreferences() {
    return (<span>User Account</span>);
  };
});

let location: Location;
jest.mock('../../containers/FactoryLoader', () => {
  return function FactoryLoader(props: RouteComponentProps) {
    location = props.location;
    return (<span>Factory Loader</span>);
  };
});

describe('Routes', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  function getComponent(path: string): React.ReactElement {
    const store = new FakeStoreBuilder().build();
    return (
      <Provider store={store}>
        <MemoryRouter initialEntries={[`${path}`]}>
          <Suspense fallback={Fallback}>
            <Routes />
          </Suspense>
        </MemoryRouter>
      </Provider>
    );
  }

  describe('Get Started route', () => {

    it('should handle "/"', async () => {
      const path = ROUTE.HOME;
      render(getComponent(path));

      await waitFor(() => expect(screen.queryByTestId('fallback-spinner')).not.toBeInTheDocument());

      expect(screen.queryByText('Get Started')).toBeTruthy();
    });

    it('should handle "/get-started"', async () => {
      const path = buildGettingStartedPath();
      render(getComponent(path));

      await waitFor(() => expect(screen.queryByTestId('fallback-spinner')).not.toBeInTheDocument());

      expect(screen.queryByText('Get Started')).toBeTruthy();
    });

    it('should handle "/get-started?tab=get-started"', async () => {
      const path = buildGettingStartedPath('get-started');
      render(getComponent(path));

      await waitFor(() => expect(screen.queryByTestId('fallback-spinner')).not.toBeInTheDocument());

      expect(screen.queryByText('Get Started')).toBeTruthy();
    });

    it('should handle "/get-started?tab=custom-workspace"', async () => {
      const path = buildGettingStartedPath('custom-workspace');
      render(getComponent(path));

      await waitFor(() => expect(screen.queryByTestId('fallback-spinner')).not.toBeInTheDocument());

      expect(screen.queryByText('Get Started')).toBeTruthy();
    });

  });

  describe('Workspaces List route', () => {

    it('should handle "/workspaces"', async () => {
      const path = buildWorkspacesPath();
      render(getComponent(path));

      await waitFor(() => expect(screen.queryByTestId('fallback-spinner')).not.toBeInTheDocument());

      expect(screen.queryByText('Workspaces List')).toBeTruthy();
    });

  });

  describe('Workspace Details route', () => {

    let workspace: che.Workspace;

    beforeEach(() => {
      workspace = {
        namespace: 'namespace',
        devfile: {
          metadata: {
            name: 'name',
          },
        },
      } as che.Workspace;
    });

    it('should handle "/workspace/namespace/name"', async () => {
      const path = buildDetailsPath(workspace);
      render(getComponent(path));

      await waitFor(() => expect(screen.queryByTestId('fallback-spinner')).not.toBeInTheDocument());

      expect(screen.queryByText('Workspace Details')).toBeTruthy();
    });

    it('should handle "/workspace/namespace/name?tab=Overview"', async () => {
      const path = buildDetailsPath(workspace, WorkspaceDetailsTab.Overview);
      render(getComponent(path));

      await waitFor(() => expect(screen.queryByTestId('fallback-spinner')).not.toBeInTheDocument());

      expect(screen.queryByText('Workspace Details')).toBeTruthy();
    });

    it('should handle "/workspace/namespace/name?tab=Devfile"', async () => {
      const path = buildDetailsPath(workspace, WorkspaceDetailsTab.Devfile);
      render(getComponent(path));

      await waitFor(() => expect(screen.queryByTestId('fallback-spinner')).not.toBeInTheDocument());

      expect(screen.queryByText('Workspace Details')).toBeTruthy();
    });

    it('should handle "/workspace/namespace/name?tab=Logs"', async () => {
      const path = buildDetailsPath(workspace, WorkspaceDetailsTab.Logs);
      render(getComponent(path));

      await waitFor(() => expect(screen.queryByTestId('fallback-spinner')).not.toBeInTheDocument());

      expect(screen.queryByText('Workspace Details')).toBeTruthy();
    });

  });

  describe('IDE Loader route', () => {

    let workspace: che.Workspace;

    beforeEach(() => {
      workspace = {
        namespace: 'namespace',
        devfile: {
          metadata: {
            name: 'name',
          },
        },
      } as che.Workspace;
    });

    it('should handle "/ide/namespace/name"', async () => {
      const path = buildIdeLoaderPath(workspace);
      render(getComponent(path));

      await waitFor(() => expect(screen.queryByTestId('fallback-spinner')).not.toBeInTheDocument());

      expect(screen.queryByText('Ide Loader')).toBeTruthy();
    });

    it('should handle "/ide/namespace/name?tab=Progress"', async () => {
      const path = buildIdeLoaderPath(workspace, IdeLoaderTab.Progress);
      render(getComponent(path));

      await waitFor(() => expect(screen.queryByTestId('fallback-spinner')).not.toBeInTheDocument());

      expect(screen.queryByText('Ide Loader')).toBeTruthy();
    });

    it('should handle "/ide/namespace/name?tab=Logs"', async () => {
      const path = buildIdeLoaderPath(workspace, IdeLoaderTab.Logs);
      render(getComponent(path));

      await waitFor(() => expect(screen.queryByTestId('fallback-spinner')).not.toBeInTheDocument());

      expect(screen.queryByText('Ide Loader')).toBeTruthy();
    });

  });

  describe('Factory Loader route', () => {

    it('should handle "/factory-loader?url=http://example.com"', async () => {
      const factoryUrl = 'http://example.com/factory';
      const path = buildFactoryLoaderPath(factoryUrl);
      render(getComponent(path));

      await waitFor(() => expect(screen.queryByTestId('fallback-spinner')).not.toBeInTheDocument());

      expect(screen.queryByText('Factory Loader')).toBeTruthy();
    });

    describe('redirection', () => {

      it('should handle an unsecured factory link without params', async () => {
        const factoryUrl = 'http://example.com/factory';
        render(getComponent('/' + factoryUrl));

        await waitFor(() => expect(screen.queryByTestId('fallback-spinner')).not.toBeInTheDocument());

        expect(screen.queryByText('Factory Loader')).toBeTruthy();

        const locationSearchPart = `?url=${encodeURIComponent(factoryUrl)}`;
        expect(location.search).toEqual(locationSearchPart);
      });

      it('should handle a secured factory link without params', async () => {
        const factoryUrl = 'https://example.com/factory';
        render(getComponent('/' + factoryUrl));

        await waitFor(() => expect(screen.queryByTestId('fallback-spinner')).not.toBeInTheDocument());

        expect(screen.queryByText('Factory Loader')).toBeTruthy();

        const locationSearchPart = `?url=${encodeURIComponent(factoryUrl)}`;
        expect(location.search).toEqual(locationSearchPart);
      });

      it('should handle a factory link with params', async () => {
        const factoryUrl = 'http://example.com/factory?createPolicy=perUser';
        render(getComponent('/' + factoryUrl));

        await waitFor(() => expect(screen.queryByTestId('fallback-spinner')).not.toBeInTheDocument());

        expect(screen.queryByText('Factory Loader')).toBeTruthy();

        const locationSearchPart = `?url=${encodeURIComponent(factoryUrl)}`;
        expect(location.search).toEqual(locationSearchPart);
      });

      it('should handle a factory link with oauth params left as search params', async () => {
        const factoryUrl = 'http://example.com/factory?createPolicy=perUser';
        const oauthParams = '&state=param1&session_state=param2&code=param3';
        render(getComponent('/' + factoryUrl + oauthParams));

        await waitFor(() => expect(screen.queryByTestId('fallback-spinner')).not.toBeInTheDocument());

        expect(screen.queryByText('Factory Loader')).toBeTruthy();

        const locationSearchPart = `?url=${encodeURIComponent(factoryUrl)}`;
        expect(location.search).toEqual(locationSearchPart);
      });

      it('should handle a factory link with oauth params left as part of pathname', async () => {
        const factoryUrl = 'http://example.com/factory';
        const oauthParams = '&state=param1&session_state=param2&code=param3';
        render(getComponent('/' + factoryUrl + oauthParams));

        await waitFor(() => expect(screen.queryByTestId('fallback-spinner')).not.toBeInTheDocument());

        expect(screen.queryByText('Factory Loader')).toBeTruthy();

        const locationSearchPart = `?url=${encodeURIComponent(factoryUrl)}`;
        expect(location.search).toEqual(locationSearchPart);
      });

    });

  });

  describe('User Preferences route', () => {

    it('should handle "/user-preferences"', async () => {
      const path = ROUTE.USER_PREFERENCES;
      render(getComponent(path));

      await waitFor(() => expect(screen.queryByTestId('fallback-spinner')).not.toBeInTheDocument());

      expect(screen.queryByText('User Preferences')).toBeTruthy();
    });

  });

  describe('User Account route', () => {

    it('should handle "/user-account"', async () => {
      const path = ROUTE.USER_ACCOUNT;
      render(getComponent(path));

      await waitFor(() => expect(screen.queryByTestId('fallback-spinner')).not.toBeInTheDocument());

      expect(screen.queryByText('User Account')).toBeTruthy();
    });

  });

});
