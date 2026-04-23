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

import { ValidatedOptions } from '@patternfly/react-core';
import { StateMock } from '@react-mock/state';
import userEvent from '@testing-library/user-event';
import * as React from 'react';

import { GitConfigUserName, State } from '@/pages/UserPreferences/GitConfig/Form/SectionUser/Name';
import getComponentRenderer, { screen, waitFor } from '@/services/__mocks__/getComponentRenderer';

jest.mock('@/components/InputGroupExtended');

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

const mockOnChange = jest.fn();

describe('GitConfigUserName', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('snapshot, not loading', () => {
    const snapshot = createSnapshot('user one', false);
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  test('snapshot, loading', () => {
    const snapshot = createSnapshot('user one', true);
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  it('should fail validation if value is empty', async () => {
    renderComponent('user one', false);

    const textInput = screen.getByRole('textbox');
    await userEvent.clear(textInput);

    expect(screen.getByTestId('validated')).toHaveTextContent(ValidatedOptions.error);
  });

  it('should fail validation if value is too long', async () => {
    renderComponent('user one', false);

    const textInput = screen.getByRole('textbox');
    await userEvent.click(textInput);
    await userEvent.paste('a'.repeat(129));

    expect(screen.getByTestId('validated')).toHaveTextContent(ValidatedOptions.error);
  });

  it('should reset validation', async () => {
    const initialValue = 'user name';
    const localState: Partial<State> = {
      value: '',
      validated: ValidatedOptions.error,
    };

    const { reRenderComponent } = renderComponent(initialValue, true, localState);

    reRenderComponent(initialValue, false, localState);

    await waitFor(() =>
      expect(screen.getByTestId('validated')).toHaveTextContent(ValidatedOptions.default),
    );
  });

  it('should handle value changing', async () => {
    renderComponent('user one', false);

    const textInput = screen.getByRole('textbox');
    await userEvent.click(textInput);
    await userEvent.paste(' two');

    expect(mockOnChange).toHaveBeenCalledWith('user one two', true);
  });

  it('should show "Name is required" error message when value is empty', async () => {
    renderComponent('user one', false);

    const textInput = screen.getByRole('textbox');
    await userEvent.clear(textInput);

    expect(screen.getByText('Name is required')).toBeInTheDocument();
  });

  it('should show "Name must not exceed 128 characters" error message when value is too long', async () => {
    renderComponent('user one', false);

    const textInput = screen.getByRole('textbox');
    await userEvent.clear(textInput);
    await userEvent.paste('a'.repeat(129));

    expect(screen.getByText('Name must not exceed 128 characters')).toBeInTheDocument();
  });

  it('should not show error message when value is valid', () => {
    renderComponent('user one', false);

    expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
    expect(screen.queryByText('Name must not exceed 128 characters')).not.toBeInTheDocument();
  });
});

function getComponent(
  value: string,
  isLoading: boolean,
  localState?: Partial<State>,
): React.ReactElement {
  if (localState) {
    return (
      <StateMock state={localState}>
        <GitConfigUserName isLoading={isLoading} value={value} onChange={mockOnChange} />
      </StateMock>
    );
  }
  return <GitConfigUserName isLoading={isLoading} value={value} onChange={mockOnChange} />;
}
