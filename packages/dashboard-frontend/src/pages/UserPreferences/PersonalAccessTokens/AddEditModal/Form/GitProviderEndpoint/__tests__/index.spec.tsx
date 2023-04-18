/*
 * Copyright (c) 2018-2023 Red Hat, Inc.
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
import userEvent from '@testing-library/user-event';
import React from 'react';
import { GitProviderEndpoint } from '..';
import getComponentRenderer, {
  screen,
} from '../../../../../../../services/__mocks__/getComponentRenderer';

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

const mockOnChange = jest.fn();

describe('GitProviderEndpoint', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('snapshot w/o endpoint', () => {
    const snapshot = createSnapshot();
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  test('snapshot with endpoint', () => {
    const snapshot = createSnapshot('https://provider/endpoint');
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  it('should handle a correct endpoint', () => {
    const endpoint = 'https://provider/endpoint';
    renderComponent();

    expect(mockOnChange).not.toHaveBeenCalled();

    const input = screen.getByRole('textbox');
    userEvent.paste(input, endpoint);

    expect(mockOnChange).toHaveBeenCalledWith(endpoint, true);
    expect(screen.queryByText('The URL is not valid.')).toBeFalsy();
  });

  it('should handle endpoint started with an incorrect protocol', () => {
    const endpoint = 'asdf://provider/endpoint';
    renderComponent();

    expect(mockOnChange).not.toHaveBeenCalled();

    const input = screen.getByRole('textbox');
    userEvent.paste(input, endpoint);

    expect(mockOnChange).toHaveBeenCalledWith(endpoint, false);
    expect(screen.queryByText('The URL is not valid.')).toBeTruthy();
  });

  it('should handle endpoint w/o protocol', () => {
    const endpoint = 'provider/endpoint';
    renderComponent();

    expect(mockOnChange).not.toHaveBeenCalled();

    const input = screen.getByRole('textbox');
    userEvent.paste(input, endpoint);

    expect(mockOnChange).toHaveBeenCalledWith(endpoint, false);
    expect(screen.queryByText('The URL is not valid.')).toBeTruthy();
  });

  it('should handle an empty value', () => {
    const endpoint = 'https://provider/endpoint';
    renderComponent(endpoint);

    expect(mockOnChange).not.toHaveBeenCalled();

    const input = screen.getByRole('textbox');
    userEvent.clear(input);

    expect(mockOnChange).toHaveBeenCalledWith('', false);
    expect(screen.queryByText('This field is required.')).toBeTruthy();
  });
});

function getComponent(providerEndpoint?: string): React.ReactElement {
  return (
    <Form>
      <GitProviderEndpoint
        providerEndpoint={providerEndpoint}
        onChange={(...args) => mockOnChange(...args)}
      />
    </Form>
  );
}
