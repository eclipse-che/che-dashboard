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

// mute the outputs
console.error = jest.fn();

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

  it('should update balk selectors', async () => {
    // render the component with tags and languages
    const { reRenderComponent } = renderComponent();
    // check that the tags and languages filters are present
    expect(screen.queryByLabelText('Filter by tags')).toBeTruthy();
    expect(screen.queryByLabelText('Filter by languages')).toBeTruthy();
    // re-render the component without tags and languages
    reRenderComponent(new MockStoreBuilder().build());
    // remove the tags and languages filters
    expect(screen.queryByLabelText('Filter by tags')).toBeFalsy();
    expect(screen.queryByLabelText('Filter by languages')).toBeFalsy();
  });

  it('should call "setTagsFilter" action', async () => {
    jest.spyOn(devfileRegistriesActionCreators, 'setTagsFilter');

    renderComponent();

    const balkSelector = screen.getByLabelText('Filter by tags');
    expect(balkSelector).toBeTruthy();
    await userEvent.click(balkSelector);

    const filterCheckbox = screen.getByLabelText('Empty');
    await userEvent.click(filterCheckbox);

    await waitFor(() =>
      expect(devfileRegistriesActionCreators.setTagsFilter).toHaveBeenCalledTimes(1),
    );
    await waitFor(() =>
      expect(devfileRegistriesActionCreators.setTagsFilter).toHaveBeenCalledWith(['Empty']),
    );
  });

  it('should call "setLanguagesFilter" action', async () => {
    jest.spyOn(devfileRegistriesActionCreators, 'setLanguagesFilter');

    renderComponent();

    const balkSelector = screen.getByLabelText('Filter by languages');
    expect(balkSelector).toBeTruthy();
    await userEvent.click(balkSelector);

    const filterCheckbox = screen.getByLabelText('.NET');
    await userEvent.click(filterCheckbox);

    await waitFor(() =>
      expect(devfileRegistriesActionCreators.setLanguagesFilter).toHaveBeenCalledTimes(1),
    );
    await waitFor(() =>
      expect(devfileRegistriesActionCreators.setLanguagesFilter).toHaveBeenCalledWith(['.NET']),
    );
  });

  it('should show the results counter with filter', async () => {
    const store = createFakeStore(mockMetadata, {
      filter: 'bash',
      tagsFilter: [],
      languagesFilter: [],
    });

    renderComponent(store);

    await waitFor(() => screen.queryByText('1 item'));
  });

  it('should show the results counter with tagsFilter', async () => {
    const store = createFakeStore(mockMetadata, {
      filter: '',
      tagsFilter: ['ubi8', 'Empty'],
      languagesFilter: [],
    });

    renderComponent(store);

    await waitFor(() => screen.queryByText('2 items'));
  });

  it('should show the results counter with languagesFilter', async () => {
    const store = createFakeStore(mockMetadata, {
      filter: '',
      tagsFilter: [],
      languagesFilter: ['Python', 'PHP'],
    });

    renderComponent(store);

    await waitFor(() => screen.queryByText('2 items'));
  });

  test('switch temporary storage toggle', async () => {
    renderComponent();
    const switchInput = screen.getByRole('checkbox') as HTMLInputElement;

    expect(switchInput.checked).toBeFalsy();

    await userEvent.click(switchInput);

    expect(switchInput.checked).toBeTruthy();
  });
});

function createFakeStore(
  metadata: che.DevfileMetaData[] | undefined,
  options: {
    filter: string;
    tagsFilter: string[];
    languagesFilter: string[];
  } = { filter: '', tagsFilter: [], languagesFilter: [] },
) {
  const registries = {};
  if (metadata) {
    registries['registry-location'] = {
      metadata,
    };
  }
  const { filter, tagsFilter, languagesFilter } = options;
  return new MockStoreBuilder()
    .withBranding({
      docs: {
        storageTypes: 'https://docs.location',
      },
    } as BrandingData)
    .withDevfileRegistries({
      registries,
      filter,
      tagsFilter,
      languagesFilter,
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
