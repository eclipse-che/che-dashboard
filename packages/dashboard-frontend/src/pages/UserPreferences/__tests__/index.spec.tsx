/*
 * Copyright (c) 2018-2025 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Provider } from 'react-redux';
import { Location } from 'react-router-dom';

import UserPreferences from '@/pages/UserPreferences';
import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';
import { buildUserPreferencesLocation } from '@/services/helpers/location';
import { UserPreferencesTab } from '@/services/helpers/types';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';

jest.mock('../ContainerRegistriesTab');
jest.mock('../GitConfig');
jest.mock('../GitServices');
jest.mock('../PersonalAccessTokens');
jest.mock('../SshKeys');

const { renderComponent } = getComponentRenderer(getComponent);

const mockNavigate = jest.fn();

function getComponent(location: Location): React.ReactElement {
  const store = new MockStoreBuilder().build();
  return (
    <Provider store={store}>
      <UserPreferences location={location} navigate={mockNavigate} />
    </Provider>
  );
}

describe('UserPreferences', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('snapshot', () => {
    const location = buildUserPreferencesLocation();
    renderComponent(location);

    expect(document.body).toMatchSnapshot();
  });

  it('should activate the Container Registries tab by default', () => {
    const location = buildUserPreferencesLocation('unknown-tab-name' as UserPreferencesTab);

    renderComponent(location);

    expect(screen.queryByRole('tabpanel', { name: 'Container Registries' })).toBeTruthy();
  });

  describe('Location change', () => {
    it('should activate the Container Registries tab', () => {
      const location = buildUserPreferencesLocation(UserPreferencesTab.CONTAINER_REGISTRIES);
      renderComponent(location);

      expect(screen.queryByRole('tabpanel', { name: 'Container Registries' })).toBeTruthy();
    });

    it('should activate the Git Services tab', () => {
      const location = buildUserPreferencesLocation(UserPreferencesTab.GIT_SERVICES);
      renderComponent(location);

      expect(screen.queryByRole('tabpanel', { name: 'Git Services' })).toBeTruthy();
    });

    it('should activate the Personal Access Tokens tab', () => {
      const location = buildUserPreferencesLocation(UserPreferencesTab.PERSONAL_ACCESS_TOKENS);
      renderComponent(location);

      expect(screen.queryByRole('tabpanel', { name: 'Personal Access Tokens' })).toBeTruthy();
    });

    it('should activate the SSH Keys tab', () => {
      const location = buildUserPreferencesLocation(UserPreferencesTab.SSH_KEYS);
      renderComponent(location);

      expect(screen.queryByRole('tabpanel', { name: 'SSH Keys' })).toBeTruthy();
    });
  });

  describe('Tabs', () => {
    it('should activate the Container Registries tab', async () => {
      const location = buildUserPreferencesLocation(UserPreferencesTab.SSH_KEYS);
      renderComponent(location);

      const tab = screen.getByRole('tab', { name: 'Container Registries' });
      await userEvent.click(tab);

      expect(screen.queryByRole('tabpanel', { name: 'Container Registries' })).toBeTruthy();
    });

    it('should activate the Git Services tab', async () => {
      const location = buildUserPreferencesLocation(UserPreferencesTab.SSH_KEYS);
      renderComponent(location);

      const tab = screen.getByRole('tab', { name: 'Git Services' });
      await userEvent.click(tab);

      expect(screen.queryByRole('tabpanel', { name: 'Git Services' })).toBeTruthy();
    });

    it('should activate the Personal Access Tokens tab', async () => {
      const location = buildUserPreferencesLocation(UserPreferencesTab.SSH_KEYS);
      renderComponent(location);

      const tab = screen.getByRole('tab', { name: 'Personal Access Tokens' });
      await userEvent.click(tab);

      expect(screen.queryByRole('tabpanel', { name: 'Personal Access Tokens' })).toBeTruthy();
    });

    it('should activate the Gitconfig tab', async () => {
      const location = buildUserPreferencesLocation(UserPreferencesTab.SSH_KEYS);
      renderComponent(location);

      const tab = screen.getByRole('tab', { name: 'Gitconfig' });
      await userEvent.click(tab);

      expect(screen.queryByRole('tabpanel', { name: 'Gitconfig' })).toBeTruthy();
    });

    it('should activate the SSH Keys tab', async () => {
      const location = buildUserPreferencesLocation(UserPreferencesTab.CONTAINER_REGISTRIES);
      renderComponent(location);

      const tab = screen.getByRole('tab', { name: 'SSH Keys' });
      await userEvent.click(tab);

      expect(screen.queryByRole('tabpanel', { name: 'SSH Keys' })).toBeTruthy();
    });
  });

  describe('Keyboard navigation', () => {
    it('should move to the next tab on ArrowRight', () => {
      const location = buildUserPreferencesLocation(UserPreferencesTab.CONTAINER_REGISTRIES);
      renderComponent(location);

      const tab = screen.getByRole('tab', { name: 'Container Registries' });
      fireEvent.keyDown(tab, { key: 'ArrowRight' });

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining(`tab=${UserPreferencesTab.GIT_SERVICES}`),
      );
    });

    it('should move to the next tab on ArrowDown', () => {
      const location = buildUserPreferencesLocation(UserPreferencesTab.CONTAINER_REGISTRIES);
      renderComponent(location);

      const tab = screen.getByRole('tab', { name: 'Container Registries' });
      fireEvent.keyDown(tab, { key: 'ArrowDown' });

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining(`tab=${UserPreferencesTab.GIT_SERVICES}`),
      );
    });

    it('should move to the previous tab on ArrowLeft', () => {
      const location = buildUserPreferencesLocation(UserPreferencesTab.GIT_SERVICES);
      renderComponent(location);

      const tab = screen.getByRole('tab', { name: 'Git Services' });
      fireEvent.keyDown(tab, { key: 'ArrowLeft' });

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining(`tab=${UserPreferencesTab.CONTAINER_REGISTRIES}`),
      );
    });

    it('should move to the previous tab on ArrowUp', () => {
      const location = buildUserPreferencesLocation(UserPreferencesTab.GIT_SERVICES);
      renderComponent(location);

      const tab = screen.getByRole('tab', { name: 'Git Services' });
      fireEvent.keyDown(tab, { key: 'ArrowUp' });

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining(`tab=${UserPreferencesTab.CONTAINER_REGISTRIES}`),
      );
    });

    it('should wrap around to the first tab on ArrowRight from the last tab', () => {
      const location = buildUserPreferencesLocation(UserPreferencesTab.SSH_KEYS);
      renderComponent(location);

      const tab = screen.getByRole('tab', { name: 'SSH Keys' });
      fireEvent.keyDown(tab, { key: 'ArrowRight' });

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining(`tab=${UserPreferencesTab.CONTAINER_REGISTRIES}`),
      );
    });

    it('should wrap around to the last tab on ArrowLeft from the first tab', () => {
      const location = buildUserPreferencesLocation(UserPreferencesTab.CONTAINER_REGISTRIES);
      renderComponent(location);

      const tab = screen.getByRole('tab', { name: 'Container Registries' });
      fireEvent.keyDown(tab, { key: 'ArrowLeft' });

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining(`tab=${UserPreferencesTab.SSH_KEYS}`),
      );
    });

    it('should move to the first tab on Home', () => {
      const location = buildUserPreferencesLocation(UserPreferencesTab.GITCONFIG);
      renderComponent(location);

      const tab = screen.getByRole('tab', { name: 'Gitconfig' });
      fireEvent.keyDown(tab, { key: 'Home' });

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining(`tab=${UserPreferencesTab.CONTAINER_REGISTRIES}`),
      );
    });

    it('should move to the last tab on End', () => {
      const location = buildUserPreferencesLocation(UserPreferencesTab.CONTAINER_REGISTRIES);
      renderComponent(location);

      const tab = screen.getByRole('tab', { name: 'Container Registries' });
      fireEvent.keyDown(tab, { key: 'End' });

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining(`tab=${UserPreferencesTab.SSH_KEYS}`),
      );
    });

    it('should not navigate on unhandled keys', () => {
      const location = buildUserPreferencesLocation(UserPreferencesTab.CONTAINER_REGISTRIES);
      renderComponent(location);

      const tab = screen.getByRole('tab', { name: 'Container Registries' });
      fireEvent.keyDown(tab, { key: 'Enter' });

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should not navigate when keydown target is not a tab', () => {
      const location = buildUserPreferencesLocation(UserPreferencesTab.CONTAINER_REGISTRIES);
      renderComponent(location);

      const tabPanel = screen.getByRole('tabpanel', { name: 'Container Registries' });
      fireEvent.keyDown(tabPanel, { key: 'ArrowRight' });

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
