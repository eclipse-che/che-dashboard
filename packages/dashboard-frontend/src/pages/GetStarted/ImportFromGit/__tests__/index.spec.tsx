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

import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Provider } from 'react-redux';
import { Store } from 'redux';

import ImportFromGit from '@/pages/GetStarted/ImportFromGit';
import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';
import { FakeStoreBuilder } from '@/store/__mocks__/storeBuilder';

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

const history = createMemoryHistory({
  initialEntries: ['/'],
});

global.window.open = jest.fn();

describe('GitRepoLocationInput', () => {
  let store: Store;

  beforeEach(() => {
    store = new FakeStoreBuilder().build();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('snapshot', () => {
    const component = createSnapshot(store);
    expect(component).toMatchSnapshot();
  });

  test('valid http:// location', () => {
    renderComponent(store);

    const input = screen.getByRole('textbox');
    expect(input).toBeValid();

    userEvent.paste(input, 'http://test-location/');

    expect(input).toHaveValue('http://test-location/');
    expect(input).toBeValid();

    const button = screen.getByRole('button');
    expect(button).toBeEnabled();

    userEvent.click(button);
    expect(window.open).toHaveBeenLastCalledWith(
      'http://localhost/#http://test-location/',
      '_blank',
    );
    expect(window.open).toHaveBeenCalledTimes(1);

    userEvent.type(input, '{enter}');
    expect(window.open).toHaveBeenCalledTimes(2);
  });

  test('invalid location', () => {
    renderComponent(store);

    const input = screen.getByRole('textbox');
    expect(input).toBeValid();

    userEvent.paste(input, 'invalid-test-location');

    expect(input).toHaveValue('invalid-test-location');
    expect(input).toBeInvalid();

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();

    userEvent.type(input, '{enter}');
    expect(window.open).not.toHaveBeenCalled();
  });

  test('valid Git+SSH location with SSH keys', () => {
    const store = new FakeStoreBuilder()
      .withSshKeys({ keys: [{ name: 'key1', keyPub: 'publicKey' }] })
      .build();
    renderComponent(store);

    const input = screen.getByRole('textbox');
    expect(input).toBeValid();

    userEvent.paste(input, 'git@github.com:user/repo.git');

    expect(input).toHaveValue('git@github.com:user/repo.git');
    expect(input).toBeValid();

    const buttonCreate = screen.getByRole('button', { name: 'Create & Open' });
    expect(buttonCreate).toBeEnabled();
  });

  test('valid Git+SSH location w/o SSH keys', () => {
    renderComponent(store);

    const input = screen.getByRole('textbox');
    expect(input).toBeValid();

    userEvent.paste(input, 'git@github.com:user/repo.git');

    expect(input).toHaveValue('git@github.com:user/repo.git');
    expect(input).toBeInvalid();

    const buttonCreate = screen.getByRole('button', { name: 'Create & Open' });
    expect(buttonCreate).toBeDisabled();

    const buttonUserPreferences = screen.getByRole('button', { name: 'here' });

    userEvent.click(buttonUserPreferences);
    expect(history.location.pathname).toBe('/user-preferences');
    expect(history.location.search).toBe('?tab=SshKeys');
  });
});

function getComponent(store: Store) {
  return (
    <Provider store={store}>
      <ImportFromGit history={history} />
    </Provider>
  );
}
