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

import { waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { Location } from 'react-router-dom';
import { Store } from 'redux';

import { MIN_STEP_DURATION_MS } from '@/components/WorkspaceProgress/const';
import getComponentRenderer from '@/services/__mocks__/getComponentRenderer';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';

import CreateWorkspace from '..';

const { renderComponent } = getComponentRenderer(getComponent);

const mockOnNextStep = jest.fn();
const mockOnRestart = jest.fn();
const mockOnError = jest.fn();
const mockOnHideError = jest.fn();

const searchParams = new URLSearchParams();

describe('Creating steps, creating a workspace', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('should switch to the next step', async () => {
    const store = new MockStoreBuilder().build();

    renderComponent(store, searchParams);

    await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

    await waitFor(() => expect(mockOnNextStep).toHaveBeenCalled());

    expect(mockOnRestart).not.toHaveBeenCalled();
    expect(mockOnError).not.toHaveBeenCalled();
  });
});

function getComponent(store: Store, searchParams: URLSearchParams): React.ReactElement {
  return (
    <Provider store={store}>
      <CreateWorkspace
        distance={0}
        hasChildren={true}
        location={{} as Location}
        navigate={jest.fn()}
        searchParams={searchParams}
        onNextStep={mockOnNextStep}
        onRestart={mockOnRestart}
        onError={mockOnError}
        onHideError={mockOnHideError}
      />
    </Provider>
  );
}
