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
import userEvent from '@testing-library/user-event';
import React from 'react';

import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';

import { GitProviderOrganization } from '..';

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

const mockOnChange = jest.fn();

describe('GitProviderOrganization', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('snapshot w/o organization', () => {
    const snapshot = createSnapshot();
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  test('snapshot with organization', () => {
    const snapshot = createSnapshot('user-organization');
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  it('should handle a correct organization', async () => {
    const organization = 'user-organization';
    renderComponent();

    expect(mockOnChange).not.toHaveBeenCalled();

    const input = screen.getByRole('textbox');
    await userEvent.click(input);
    await userEvent.paste(organization);

    expect(mockOnChange).toHaveBeenCalledWith(organization, true);
    expect(screen.queryByText('Git Provider Organization is required.')).toBeFalsy();
    expect(screen.queryByText(/must be \d+ characters or less/)).toBeFalsy();
  });

  it('should handle a too long organization value', async () => {
    // make it long enough to be invalid
    const organization = 'user-organization'.repeat(20);
    renderComponent();

    expect(mockOnChange).not.toHaveBeenCalled();

    const input = screen.getByRole('textbox');
    await userEvent.click(input);
    await userEvent.paste(organization);

    expect(mockOnChange).toHaveBeenCalledWith(organization, false);
    expect(screen.queryByText('Git Provider Organization is required.')).toBeFalsy();
    expect(
      screen.getByText('Git Provider Organization must be 255 characters or less.'),
    ).toBeTruthy();
  });

  it('should handle an empty value', async () => {
    const organization = 'user-organization';
    renderComponent(organization);

    expect(mockOnChange).not.toHaveBeenCalled();

    const input = screen.getByRole('textbox');
    await userEvent.clear(input);

    expect(mockOnChange).toHaveBeenCalledWith('', false);
    expect(screen.getByText('Git Provider Organization is required.')).toBeTruthy();
    expect(screen.queryByText(/must be \d+ characters or less/)).toBeFalsy();
  });

  describe('helper text behavior', () => {
    it('should not show helper text when organization is valid', async () => {
      renderComponent();

      const input = screen.getByRole('textbox');

      const validOrganization = 'user-organization';
      await userEvent.click(input);
      await userEvent.paste(validOrganization);

      // Helper text should not be present
      expect(screen.queryByText('Git Provider Organization is required.')).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Git Provider Organization must be \d+ characters or less./),
      ).not.toBeInTheDocument();
    });

    it('should show error helper text when organization is empty', async () => {
      renderComponent();

      const input = screen.getByRole('textbox');

      // First set a valid value
      await userEvent.click(input);
      await userEvent.paste('user-organization');

      // Then clear it to trigger validation
      await userEvent.clear(input);

      // Error helper text should be visible
      expect(screen.getByText('Git Provider Organization is required.')).toBeInTheDocument();
    });

    it('should show error helper text when organization is too long', async () => {
      renderComponent();

      const input = screen.getByRole('textbox');

      // Create an organization that exceeds MAX_LENGTH (255)
      const tooLongOrganization = 'a'.repeat(256);
      await userEvent.click(input);
      await userEvent.paste(tooLongOrganization);

      // Error helper text should be visible
      expect(
        screen.getByText('Git Provider Organization must be 255 characters or less.'),
      ).toBeInTheDocument();
    });

    it('should hide helper text when correcting an invalid organization', async () => {
      renderComponent('user-organization');

      const input = screen.getByRole('textbox');

      // Clear the input to trigger error
      await userEvent.clear(input);

      // Error helper text should be visible
      expect(screen.getByText('Git Provider Organization is required.')).toBeInTheDocument();

      // Now correct it
      const validOrganization = 'user-organization';
      await userEvent.click(input);
      await userEvent.paste(validOrganization);

      // Helper text should no longer be visible
      expect(screen.queryByText('Git Provider Organization is required.')).not.toBeInTheDocument();
    });

    it('should not show helper text on initial render with valid organization', () => {
      renderComponent('user-organization');

      // No helper text should be visible
      expect(screen.queryByText('Git Provider Organization is required.')).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Git Provider Organization must be \d+ characters or less./),
      ).not.toBeInTheDocument();
    });

    it('should not show helper text on initial render without organization', () => {
      renderComponent();

      // No helper text should be visible initially (validation state is 'default')
      expect(screen.queryByText('Git Provider Organization is required.')).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Git Provider Organization must be \d+ characters or less./),
      ).not.toBeInTheDocument();
    });
  });
});

function getComponent(providerOrganization?: string): React.ReactElement {
  return (
    <Form>
      <GitProviderOrganization
        providerOrganization={providerOrganization}
        onChange={mockOnChange}
      />
    </Form>
  );
}
