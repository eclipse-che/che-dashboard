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
import { RenderResult, render, screen } from '@testing-library/react';
import TemporaryStorageSwitch from '../TemporaryStorageSwitch';
import thunk from 'redux-thunk';
import createMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { Store } from 'redux';
import { AppState } from '../../../../store';
import mockMetadata from '../../__tests__/devfileMetadata.json';

describe('Temporary Storage Switch', () => {

  const mockOnChange = jest.fn();

  function renderSwitch(store: Store, persistVolumesDefault: 'true' | 'false'): RenderResult {
    return render(
      <Provider store={store}>
        <TemporaryStorageSwitch
          persistVolumesDefault={persistVolumesDefault}
          onChange={mockOnChange} />
      </Provider>
    );
  }

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be initially switched on', () => {
    const store = createFakeStoreWithMetadata();
    renderSwitch(store, 'false');
    const switchInput = screen.getByRole('checkbox') as HTMLInputElement;
    expect(switchInput.checked).toBeTruthy();

    switchInput.click();
    expect(switchInput.checked).toBeFalsy();
    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it('should be initially switched off', () => {
    const store = createFakeStoreWithMetadata();
    renderSwitch(store, 'true');
    const switchInput = screen.getByRole('checkbox') as HTMLInputElement;
    expect(switchInput.checked).toBeFalsy();

    switchInput.click();
    expect(switchInput.checked).toBeTruthy();
    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

});

function createFakeStore(metadata?: che.DevfileMetaData[]): Store {
  const initialState: AppState = {
    factoryResolver: {
      isLoading: false,
      resolver: {},
    },
    plugins: {
      isLoading: false,
      plugins: [],
    },
    workspaces: {} as any,
    branding: {
      data: {
        docs: {
          storageTypes: 'https://docs.location'
        }
      }
    } as any,
    devfileRegistries: {
      isLoading: false,
      schema: {},
      metadata: metadata || [],
      devfiles: {},
      filter: ''
    },
    user: {} as any,
    infrastructureNamespace: {} as any,
  };
  const middleware = [thunk];
  const mockStore = createMockStore(middleware);
  return mockStore(initialState);
}

function createFakeStoreWithMetadata(): Store {
  return createFakeStore(mockMetadata);
}
