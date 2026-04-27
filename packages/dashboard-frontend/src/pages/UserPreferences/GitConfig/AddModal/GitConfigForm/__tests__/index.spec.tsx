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

import userEvent from '@testing-library/user-event';
import React from 'react';

import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';
import * as GitConfigStore from '@/store/GitConfig';

import { GitConfigForm } from '..';

const mockOnChange = jest.fn();

jest.mock('@/pages/UserPreferences/GitConfig/GitConfigImport');

const { renderComponent, createSnapshot } = getComponentRenderer(getComponent);

describe('GitConfigForm', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('snapshot without predefined git configuration', () => {
    const snapshot = createSnapshot();
    expect(snapshot.toJSON()).toMatchSnapshot();
  });
  test('snapshot with predefined git configuration', () => {
    const snapshot = createSnapshot({ user: { email: 'user-1@chetest.com', name: 'User One' } });
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  it('should handle a valid value', async () => {
    renderComponent();

    const gitConfigField = screen.getByTestId('submit-valid-git-config');
    await userEvent.click(gitConfigField);

    expect(mockOnChange).toHaveBeenCalledWith(
      { user: { email: 'user-1@chetest.com', name: 'User One' } },
      true,
    );
  });

  it('should handle an invalid value', async () => {
    renderComponent();

    const gitConfigField = screen.getByTestId('submit-invalid-git-config');
    await userEvent.click(gitConfigField);

    expect(mockOnChange).toHaveBeenCalledWith({ user: { name: 'User One' } }, false);
  });

  it('should reject invalid email format', async () => {
    renderComponent();

    const gitConfigField = screen.getByTestId('submit-invalid-email-git-config');
    await userEvent.click(gitConfigField);

    expect(mockOnChange).toHaveBeenCalledWith(
      { user: { email: 'invalid-email', name: 'User One' } },
      false,
    );
  });

  it('should reject empty name', async () => {
    renderComponent();

    const gitConfigField = screen.getByTestId('submit-empty-name-git-config');
    await userEvent.click(gitConfigField);

    // When name is empty, the parser omits it from the object
    expect(mockOnChange).toHaveBeenCalledWith({ user: { email: 'user@test.com' } }, false);
  });

  it('should reject name exceeding max length', async () => {
    renderComponent();

    const gitConfigField = screen.getByTestId('submit-long-name-git-config');
    await userEvent.click(gitConfigField);

    const longName = 'a'.repeat(129);
    expect(mockOnChange).toHaveBeenCalledWith(
      { user: { email: 'user@test.com', name: longName } },
      false,
    );
  });

  describe('Error messages', () => {
    it('should display error message for missing user section', async () => {
      renderComponent();

      const gitConfigField = screen.getByTestId('submit-missing-user-section-git-config');
      await userEvent.click(gitConfigField);

      expect(
        screen.getByText('The [user] section with "name" and "email" fields is required.'),
      ).toBeInTheDocument();
    });

    it('should display error message for invalid email format', async () => {
      renderComponent();

      const gitConfigField = screen.getByTestId('submit-invalid-email-git-config');
      await userEvent.click(gitConfigField);

      expect(
        screen.getByText('User email must be a valid email address (e.g., user@example.com).'),
      ).toBeInTheDocument();
    });

    it('should display error message for empty name when email is valid', async () => {
      renderComponent();

      const gitConfigField = screen.getByTestId('submit-empty-name-git-config');
      await userEvent.click(gitConfigField);

      // Name is now required
      expect(screen.getByText('Username is required.')).toBeInTheDocument();
    });

    it('should display error message for name exceeding max length', async () => {
      renderComponent();

      const gitConfigField = screen.getByTestId('submit-long-name-git-config');
      await userEvent.click(gitConfigField);

      expect(
        screen.getByText('User name must be between 1 and 128 characters.'),
      ).toBeInTheDocument();
    });

    it('should display error message for empty email when name is valid', async () => {
      renderComponent();

      const gitConfigField = screen.getByTestId('submit-empty-email-git-config');
      await userEvent.click(gitConfigField);

      // Email is now required
      expect(screen.getByText('User email is required.')).toBeInTheDocument();
    });

    it('should display error message for email exceeding max length', async () => {
      renderComponent();

      const gitConfigField = screen.getByTestId('submit-long-email-git-config');
      await userEvent.click(gitConfigField);

      expect(
        screen.getByText('User email must be between 1 and 128 characters.'),
      ).toBeInTheDocument();
    });

    it('should display error message for malformed config', async () => {
      renderComponent();

      const gitConfigField = screen.getByTestId('submit-parse-error-git-config');
      await userEvent.click(gitConfigField);

      // The multi-ini parser is lenient and may parse malformed content
      // but it should still fail validation and show an error message
      expect(
        screen.getByText('The [user] section with "name" and "email" fields is required.'),
      ).toBeInTheDocument();
    });

    it('should display error message for max length exceeded', async () => {
      renderComponent();

      const gitConfigField = screen.getByTestId('submit-max-length-git-config');
      await userEvent.click(gitConfigField);

      expect(
        screen.getByText('The value is too long. The maximum length is 4096 characters.'),
      ).toBeInTheDocument();
    });

    it('should not display error message for valid input', async () => {
      renderComponent();

      const gitConfigField = screen.getByTestId('submit-valid-git-config');
      await userEvent.click(gitConfigField);

      expect(
        screen.queryByText('User email must be a valid email address (e.g., user@example.com).'),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText('The [user] section with "name" and "email" fields is required.'),
      ).not.toBeInTheDocument();
    });
  });

  describe('Required field validation', () => {
    it('should reject config with only name (email is required)', async () => {
      renderComponent();

      const gitConfigField = screen.getByTestId('submit-only-name-git-config');
      await userEvent.click(gitConfigField);

      expect(mockOnChange).toHaveBeenCalledWith({ user: { name: 'User One' } }, false);
      expect(screen.getByText('User email is required.')).toBeInTheDocument();
    });

    it('should reject config with only email (name is required)', async () => {
      renderComponent();

      const gitConfigField = screen.getByTestId('submit-only-email-git-config');
      await userEvent.click(gitConfigField);

      expect(mockOnChange).toHaveBeenCalledWith({ user: { email: 'user@test.com' } }, false);
      expect(screen.getByText('Username is required.')).toBeInTheDocument();
    });

    it('should reject config when both name and email are null', async () => {
      renderComponent();

      const gitConfigField = screen.getByTestId('submit-both-null-git-config');
      await userEvent.click(gitConfigField);

      expect(mockOnChange).toHaveBeenCalledWith({ user: {} }, false);
      expect(
        screen.getByText('The [user] section with "name" and "email" fields is required.'),
      ).toBeInTheDocument();
    });
  });
});

function getComponent(gitConfig?: GitConfigStore.GitConfig) {
  return <GitConfigForm onChange={mockOnChange} gitConfig={gitConfig} />;
}
