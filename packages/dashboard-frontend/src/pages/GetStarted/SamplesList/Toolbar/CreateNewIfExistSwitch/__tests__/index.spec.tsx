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

import { screen } from '@testing-library/react';
import React from 'react';

import { Navigation } from '@/Layout/Navigation';
import { CreateNewIfExistSwitch } from '@/pages/GetStarted/SamplesList/Toolbar/CreateNewIfExistSwitch';
import getComponentRenderer from '@/services/__mocks__/getComponentRenderer';

const { renderComponent, createSnapshot } = getComponentRenderer(getComponent);

const mockOnChange = jest.fn();

// mute console.error
console.error = jest.fn();

describe('Create New If Exist Switch', () => {
  beforeEach(() => {
    Navigation.pageState = {};
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('snapshot', () => {
    const snapshot = createSnapshot();
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  it('should be initially switched on', () => {
    renderComponent();
    const switchInput = screen.getByRole('checkbox') as HTMLInputElement;
    expect(switchInput.checked).toBeTruthy();
    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(Navigation.pageState['create-new-if-exist-switch']).toEqual({
      isChecked: 'true',
    });
    mockOnChange.mockReset();

    switchInput.click();
    expect(switchInput.checked).toBeFalsy();
    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(Navigation.pageState['create-new-if-exist-switch']).toEqual({
      isChecked: 'false',
    });
  });
});

function getComponent() {
  return <CreateNewIfExistSwitch onChange={mockOnChange} />;
}
