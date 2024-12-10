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

import { AlertVariant } from '@patternfly/react-core';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Provider } from 'react-redux';
import { Store } from 'redux';

import { container } from '@/inversify.config';
import GitConfig from '@/pages/UserPreferences/GitConfig';
import { mockShowAlert } from '@/pages/WorkspaceDetails/__mocks__';
import getComponentRenderer, { screen, waitFor } from '@/services/__mocks__/getComponentRenderer';
import { AppAlerts } from '@/services/alerts/appAlerts';
import { AlertItem } from '@/services/helpers/types';
import { AppThunk } from '@/store';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';
import { gitConfigActionCreators } from '@/store/GitConfig';

jest.mock('@/pages/UserPreferences/GitConfig/Form');
jest.mock('@/pages/UserPreferences/GitConfig/Viewer');
jest.mock('@/pages/UserPreferences/GitConfig/Toolbar');

// mute output
console.error = jest.fn();

const mockRequestGitConfig = jest.fn();
const mockUpdateGitConfig = jest.fn();
jest.mock('@/store/GitConfig', () => ({
  ...jest.requireActual('@/store/GitConfig'),
  gitConfigActionCreators: {
    requestGitConfig:
      (...args): AppThunk =>
      async () =>
        mockRequestGitConfig(...args),
    updateGitConfig:
      (...args): AppThunk =>
      async () =>
        mockUpdateGitConfig(...args),
  } as typeof gitConfigActionCreators,
}));

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

let store: Store;
let storeEmpty: Store;

describe('GitConfig', () => {
  beforeEach(() => {
    store = new MockStoreBuilder()
      .withGitConfig({
        config: {
          gitconfig: {
            user: {
              name: 'user',
              email: 'user@che',
            },
          },
        },
      })
      .build();
    storeEmpty = new MockStoreBuilder().build();

    class MockAppAlerts extends AppAlerts {
      showAlert(alert: AlertItem): void {
        mockShowAlert(alert);
      }
    }

    container.snapshot();
    container.rebind(AppAlerts).to(MockAppAlerts).inSingletonScope();
  });

  afterEach(() => {
    jest.clearAllMocks();
    container.restore();
  });

  describe('snapshot', () => {
    test('with no gitconfig', () => {
      const snapshot = createSnapshot(storeEmpty);
      expect(snapshot.toJSON()).toMatchSnapshot();
    });

    test('with gitconfig', () => {
      const snapshot = createSnapshot(store);
      expect(snapshot.toJSON()).toMatchSnapshot();
    });
  });

  describe('empty state', () => {
    it('should render empty state when there is not gitconfig', () => {
      renderComponent(storeEmpty);

      expect(screen.queryByRole('heading', { name: 'No gitconfig found' })).not.toBeNull();
    });

    it('should request gitconfig', () => {
      renderComponent(storeEmpty);

      expect(mockRequestGitConfig).toHaveBeenCalled();
    });
  });

  describe('while loading', () => {
    it('should not request gitconfig', () => {
      const store = new MockStoreBuilder()
        .withGitConfig(
          {
            config: undefined,
          },
          true,
        )
        .build();
      renderComponent(store);

      expect(mockRequestGitConfig).not.toHaveBeenCalled();
    });
  });

  describe('with data', () => {
    it('should update the git config and show a success notification', async () => {
      renderComponent(store);

      const saveConfigButton = screen.getByRole('button', { name: 'Save Config' });
      await userEvent.click(saveConfigButton);

      // mock should be called
      expect(mockUpdateGitConfig).toHaveBeenCalled();

      // success alert should be shown
      await waitFor(() =>
        expect(mockShowAlert).toHaveBeenCalledWith({
          key: 'gitconfig-success',
          title: 'Gitconfig saved successfully.',
          variant: AlertVariant.success,
        } as AlertItem),
      );
    });

    it('should try to update the gitconfig and show alert notification', async () => {
      const { reRenderComponent } = renderComponent(store);

      mockUpdateGitConfig.mockRejectedValueOnce(new Error('update gitconfig error'));

      const saveConfigButton = screen.getByRole('button', { name: 'Save Config' });
      await userEvent.click(saveConfigButton);

      // mock should be called
      expect(mockUpdateGitConfig).toHaveBeenCalled();

      // error alert should not be shown
      expect(mockShowAlert).not.toHaveBeenCalled();

      const nextStore = new MockStoreBuilder()
        .withGitConfig({
          config: {
            gitconfig: {
              user: {
                name: 'user',
                email: 'user@che',
              },
            },
          },
          error: 'update gitconfig error',
        })
        .build();
      reRenderComponent(nextStore);

      // error alert should be shown
      await waitFor(() =>
        expect(mockShowAlert).toHaveBeenCalledWith({
          key: 'gitconfig-error',
          title: 'update gitconfig error',
          variant: AlertVariant.danger,
        } as AlertItem),
      );
    });

    it('should reload the gitconfig', async () => {
      renderComponent(store);

      const reloadConfigButton = screen.getByRole('button', { name: 'Reload Config' });
      await userEvent.click(reloadConfigButton);

      // mock should be called
      expect(mockRequestGitConfig).toHaveBeenCalled();
    });
  });

  test('switch to viewer mode', async () => {
    renderComponent(store);

    expect(screen.getByTestId('toolbar-mode')).toHaveTextContent('form');

    const switchModeButton = screen.getByRole('button', { name: 'Switch Mode' });
    await userEvent.click(switchModeButton);

    await waitFor(() => expect(screen.getByTestId('toolbar-mode')).toHaveTextContent('viewer'));
  });
});

function getComponent(store: Store): React.ReactElement {
  return (
    <Provider store={store}>
      <GitConfig />
    </Provider>
  );
}
