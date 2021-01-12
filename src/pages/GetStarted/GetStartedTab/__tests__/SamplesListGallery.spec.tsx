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
import { Store } from 'redux';
import thunk from 'redux-thunk';
import createMockStore from 'redux-mock-store';
import { render, screen, RenderResult, fireEvent } from '@testing-library/react';
import mockAxios from 'axios';
import SamplesListGallery from '../SamplesListGallery';
import { Provider } from 'react-redux';
import { AppState } from '../../../../store';
import mockMetadata from '../../__tests__/devfileMetadata.json';

describe('Samples List Gallery', () => {

  function renderGallery(
    store: Store,
    onCardClicked: () => void = (): void => undefined
  ): RenderResult {
    return render(
      <Provider store={store}>
        <SamplesListGallery onCardClick={onCardClicked} />
      </Provider>
    );
  }

  it('should render cards with metadata', () => {
    // eslint-disable-next-line
    const store = createFakeStoreWithMetadata();
    renderGallery(store);

    const cards = screen.getAllByRole('article');
    expect(cards.length).toEqual(26);
  });

  it('should handle "onCardClick" event', async () => {

    let resolveFn: {
      (): void;
      (value?: unknown): void;
    };
    const onCardClickedPromise = new Promise(resolve => resolveFn = resolve);
    const onCardClicked = jest.fn(() => resolveFn());

    // eslint-disable-next-line
    const store = createFakeStoreWithMetadata();
    renderGallery(store, onCardClicked);

    (mockAxios.get as any).mockResolvedValueOnce({
      data: {},
    });

    const cardHeader = screen.getByText('Go');
    fireEvent.click(cardHeader);

    await onCardClickedPromise;
    expect(onCardClicked).toHaveBeenCalled();

  });

  it('should render empty state', () => {
    // eslint-disable-next-line
    const store = createFakeStoreWithoutMetadata();
    renderGallery(store);

    const emptyStateTitle = screen.getByRole('heading', { name: 'No results found' });
    expect(emptyStateTitle).toBeTruthy();
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
      devfiles: {},
      filter: '',
      isLoading: false,
      metadata: metadata || [],
      schema: {},
    },
    user: {} as any,
    infrastructureNamespace: {} as any,
  };
  const middleware = [thunk];
  const mockStore = createMockStore(middleware);
  return mockStore(initialState);
}

function createFakeStoreWithoutMetadata(): Store {
  return createFakeStore();
}

function createFakeStoreWithMetadata(): Store {
  return createFakeStore(mockMetadata);
}
