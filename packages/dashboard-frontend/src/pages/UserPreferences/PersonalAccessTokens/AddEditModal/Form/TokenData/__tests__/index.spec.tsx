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

import { Form } from '@patternfly/react-core';
import React from 'react';

import getComponentRenderer, { fireEvent, screen } from '@/services/__mocks__/getComponentRenderer';

import { TokenData } from '..';

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

const mockOnChange = jest.fn();

describe('TokenData', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('snapshot w/o token data', () => {
    const snapshot = createSnapshot(false);
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  test('snapshot with token data', () => {
    const snapshot = createSnapshot(true, 'token-data');
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  test('edit token mode', () => {
    renderComponent(true, 'token-data');

    screen.queryByPlaceholderText('Replace Token');
  });

  test('add token mode', () => {
    renderComponent(false);

    screen.queryByPlaceholderText('Enter a Token');
  });

  it('should handle token data', () => {
    renderComponent(false);

    expect(mockOnChange).not.toHaveBeenCalled();

    const input = screen.getByPlaceholderText('Enter a Token');

    const tokenData = 'token-data';
    fireEvent.change(input, { target: { value: tokenData } });

    expect(mockOnChange).toHaveBeenCalledWith(btoa(tokenData), true);
    expect(screen.queryByText('Token is required.')).toBeFalsy();
  });

  it('should handle the empty value', () => {
    renderComponent(false);

    expect(mockOnChange).not.toHaveBeenCalled();

    const input = screen.getByPlaceholderText('Enter a Token');

    // fill the token data field
    const tokenData = 'token-data';
    fireEvent.change(input, { target: { value: tokenData } });

    mockOnChange.mockClear();

    // clear the token data field
    fireEvent.change(input, { target: { value: '' } });

    expect(mockOnChange).toHaveBeenCalledWith('', false);
    expect(screen.getByText('Token is required.')).toBeTruthy();
  });

  it('should display validation error when token is empty', () => {
    renderComponent(false);

    const input = screen.getByPlaceholderText('Enter a Token');

    // Trigger validation by entering and clearing the field
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.change(input, { target: { value: '' } });

    // Verify error message is displayed
    expect(screen.getByText('Token is required.')).toBeInTheDocument();
  });

  it('should clear validation error when token is entered', () => {
    renderComponent(false);

    const input = screen.getByPlaceholderText('Enter a Token');

    // Trigger error by entering and clearing the field
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.change(input, { target: { value: '' } });
    expect(screen.getByText('Token is required.')).toBeInTheDocument();

    // Enter a valid token
    fireEvent.change(input, { target: { value: 'my-token' } });

    // Verify error message is removed
    expect(screen.queryByText('Token is required.')).not.toBeInTheDocument();
  });

  it('should show error icon when validation fails', () => {
    renderComponent(false);

    const input = screen.getByPlaceholderText('Enter a Token');

    // Trigger validation error
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.change(input, { target: { value: '' } });

    // Verify error message with icon is displayed
    const errorMessage = screen.getByText('Token is required.');
    expect(errorMessage).toBeInTheDocument();

    // The error should be in a helper text item with error variant
    const helperTextItem = errorMessage.closest('.pf-v6-c-helper-text__item');
    expect(helperTextItem).toHaveClass('pf-m-error');
  });
});

function getComponent(isEdit: boolean, tokenData?: string): React.ReactElement {
  return (
    <Form>
      <TokenData isEdit={isEdit} tokenData={tokenData} onChange={mockOnChange} />
    </Form>
  );
}
