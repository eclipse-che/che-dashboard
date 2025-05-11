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

import { Store } from '@reduxjs/toolkit';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Provider } from 'react-redux';

import mockMetadata from '@/pages/GetStarted/__tests__/devfileMetadata.json';
import SamplesListToolbar from '@/pages/GetStarted/SamplesList/Toolbar';
import getComponentRenderer, { screen, waitFor } from '@/services/__mocks__/getComponentRenderer';
import { BrandingData } from '@/services/bootstrap/branding.constant';
import { che } from '@/services/models';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';
import { devfileRegistriesActionCreators } from '@/store/DevfileRegistries';

jest.mock('@/pages/GetStarted/SamplesList/Toolbar/TemporaryStorageSwitch');

const { renderComponent, createSnapshot } = getComponentRenderer(getComponent);

describe('Samples List Toolbar', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('snapshot', () => {
    const snapshot = createSnapshot();
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  it('should initially have empty filter value', () => {
    renderComponent();
    const filterInput = screen.getByPlaceholderText('Filter by') as HTMLInputElement;
    expect(filterInput.value).toEqual('');
  });

  it('should initially have presetFilter filter value', () => {
    const store = createFakeStore(mockMetadata);
    const { reRenderComponent } = renderComponent(store, 'bash');

    const filterInput = screen.getByLabelText('Filter samples list') as HTMLInputElement;

    expect(filterInput.value).toEqual('bash');
    reRenderComponent(store, 'java');

    expect(filterInput.value).toEqual('java');
  });

  it('should not initially show the results counter', () => {
    renderComponent();
    const resultsCount = screen.queryByTestId('toolbar-results-count');
    expect(resultsCount).toBeNull();
  });

  it('should call "setFilter" action', async () => {
    jest.spyOn(devfileRegistriesActionCreators, 'setFilter');

    renderComponent();

    const filterInput = screen.getByLabelText('Filter samples list') as HTMLInputElement;
    await userEvent.click(filterInput);
    await userEvent.paste('bash');

    await waitFor(() => expect(devfileRegistriesActionCreators.setFilter).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(devfileRegistriesActionCreators.setFilter).toHaveBeenCalledWith('bash'),
    );
  });

  it('should show the results counter', async () => {
    const store = createFakeStore(mockMetadata);
    const storeNext = new MockStoreBuilder(store.getState())
      .withDevfileRegistries({
        filter: 'bash',
        tagsFilter: [],
        languagesFilter: [],
      })
      .build();

    renderComponent(storeNext);
    const filterInput = screen.getByPlaceholderText('Filter by') as HTMLInputElement;
    await userEvent.click(filterInput);
    await userEvent.paste('bash');

    await waitFor(() => screen.queryByText('1 item'));
  });

  test('switch temporary storage toggle', async () => {
    renderComponent();
    const switchInput = screen.getByRole('checkbox') as HTMLInputElement;

    expect(switchInput.checked).toBeFalsy();

    await userEvent.click(switchInput);

    expect(switchInput.checked).toBeTruthy();
  });
});

function createFakeStore(metadata?: che.DevfileMetaData[]) {
  const registries = {};
  if (metadata) {
    registries['registry-location'] = {
      metadata,
    };
  }
  return new MockStoreBuilder()
    .withBranding({
      docs: {
        storageTypes: 'https://docs.location',
      },
    } as BrandingData)
    .withDevfileRegistries({
      registries,
      filter: '',
      tagsFilter: [],
      languagesFilter: [],
    })
    .build();
}

function getComponent(store?: Store, presetFilter: string | undefined = undefined) {
  store ||= createFakeStore(mockMetadata);
  return (
    <Provider store={store}>
      <SamplesListToolbar
        presetFilter={presetFilter}
        isTemporary={true}
        onTemporaryStorageChange={jest.fn()}
      />
    </Provider>
  );
}
