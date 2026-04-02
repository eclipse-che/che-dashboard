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
});

function getComponent(gitConfig?: GitConfigStore.GitConfig) {
  return <GitConfigForm onChange={mockOnChange} gitConfig={gitConfig} />;
}
