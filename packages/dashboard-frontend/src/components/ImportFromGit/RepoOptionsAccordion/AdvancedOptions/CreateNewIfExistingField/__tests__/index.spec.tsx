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

import { act, screen } from '@testing-library/react';
import React from 'react';

import { CreateNewIfExistingField } from '@/components/ImportFromGit/RepoOptionsAccordion/AdvancedOptions/CreateNewIfExistingField';
import { Navigation } from '@/Layout/Navigation';
import { CREATE_NEW_IF_EXIST_SWITCH_ID } from '@/pages/GetStarted/SamplesList/Toolbar/CreateNewIfExistSwitch';
import getComponentRenderer from '@/services/__mocks__/getComponentRenderer';

const { renderComponent } = getComponentRenderer(getComponent);

const mockOnChange = jest.fn();

describe('CreateNewIfExistingField', () => {
  beforeEach(() => {
    Navigation.pageState[CREATE_NEW_IF_EXIST_SWITCH_ID] = { isChecked: undefined };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should adopt global state=true on mount and propagate it when local default is false', () => {
    Navigation.pageState[CREATE_NEW_IF_EXIST_SWITCH_ID] = { isChecked: true };
    renderComponent(undefined);

    // props.onChange is called synchronously inside handleChange during componentDidMount
    expect(mockOnChange).toHaveBeenCalledWith(true);
  });

  it('should not call onChange when global state matches local state', () => {
    Navigation.pageState[CREATE_NEW_IF_EXIST_SWITCH_ID] = { isChecked: false };
    renderComponent(false);

    const switchInput = screen.getByRole('switch') as HTMLInputElement;
    expect(switchInput.checked).toBeFalsy();
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('should write local state to global and not call onChange when global is undefined', () => {
    renderComponent(false);

    expect(mockOnChange).not.toHaveBeenCalled();
    expect(Navigation.pageState[CREATE_NEW_IF_EXIST_SWITCH_ID]).toEqual({ isChecked: false });
  });

  it('should respond to future global state changes via subscription', () => {
    renderComponent(false);
    jest.clearAllMocks();

    act(() => {
      Navigation.pageState[CREATE_NEW_IF_EXIST_SWITCH_ID] = { isChecked: true };
    });

    expect(mockOnChange).toHaveBeenCalledWith(true);
    const switchInput = screen.getByRole('switch') as HTMLInputElement;
    expect(switchInput.checked).toBeTruthy();
  });
});

function getComponent(createNewIfExisting: boolean | undefined) {
  return (
    <CreateNewIfExistingField createNewIfExisting={createNewIfExisting} onChange={mockOnChange} />
  );
}
