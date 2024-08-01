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

import React from 'react';

import { UntrustedSourceModal } from '@/components/UntrustedSourceModal';
import getComponentRenderer, { screen, waitFor } from '@/services/__mocks__/getComponentRenderer';

const mockGetItem = jest.fn();
const mockUpdateItem = jest.fn();
jest.mock('@/services/session-storage', () => {
  return {
    __esModule: true,
    default: {
      get: (...args: unknown[]) => mockGetItem(...args),
      update: (...args: unknown[]) => mockUpdateItem(...args),
    },
    // enum
    SessionStorageKey: {
      TRUSTED_SOURCES: 'trusted-sources', // 'all' or 'repo1,repo2,...'
    },
  };
});

const mockOnContinue = jest.fn();
const mockOnClose = jest.fn();

const { renderComponent } = getComponentRenderer(getComponent);

describe('Untrusted Repo Warning Modal', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('isSourceTrusted', () => {
    test('some sources are trusted', () => {
      mockGetItem.mockReturnValue('repo1,repo2');
      expect(UntrustedSourceModal.isSourceTrusted('repo1')).toBeTruthy();
      expect(UntrustedSourceModal.isSourceTrusted('repo2')).toBeTruthy();
      expect(UntrustedSourceModal.isSourceTrusted('repo3')).toBeFalsy();
    });

    test('all sources are trusted', () => {
      mockGetItem.mockReturnValue('all');
      expect(UntrustedSourceModal.isSourceTrusted('repo1')).toBeTruthy();
    });
  });

  describe('updateTrustedSources', () => {
    test('trust all', () => {
      mockGetItem.mockReturnValue('repo1,repo2');
      UntrustedSourceModal.updateTrustedSources('repo1', true);
      expect(mockUpdateItem).toHaveBeenCalledWith('trusted-sources', 'all');
    });

    test('trust one', () => {
      mockGetItem.mockReturnValue('repo1,repo2');
      UntrustedSourceModal.updateTrustedSources('repo3', false);
      expect(mockUpdateItem).toHaveBeenCalledWith('trusted-sources', 'repo1,repo2,repo3');
    });
  });

  test('modal is hidden', () => {
    renderComponent('source-location', false);
    const modal = screen.queryByRole('dialog');
    expect(modal).toBeNull();
  });

  test('modal is visible', () => {
    mockGetItem.mockClear();
    renderComponent('source-location');
    const modal = screen.queryByRole('dialog');
    expect(modal).not.toBeNull();
  });

  test('close button is clicked', () => {
    renderComponent('source-location');
    const closeButton = screen.getByRole('button', { name: 'Close' });

    // button is enabled
    expect(closeButton).toBeEnabled();

    closeButton.click();
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('cancel button is clicked', () => {
    renderComponent('source-location');
    const closeButton = screen.getByRole('button', { name: 'Cancel' });

    // button is enabled
    expect(closeButton).toBeEnabled();

    closeButton.click();
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('continue button is clicked', () => {
    renderComponent('source-location');
    const continueButton = screen.getByRole('button', { name: 'Continue' });

    // button is enabled
    expect(continueButton).toBeEnabled();

    continueButton.click();
    expect(mockOnContinue).toHaveBeenCalledTimes(1);

    expect(mockUpdateItem).toHaveBeenCalledTimes(1);
    expect(mockUpdateItem).toHaveBeenCalledWith('trusted-sources', 'source-location');
  });

  test('trust all checkbox is clicked', () => {
    renderComponent('source-location');

    const checkbox = screen.getByRole('checkbox', { name: /do not ask me again/i });

    // checkbox is unchecked
    expect(checkbox).not.toBeChecked();

    checkbox.click();

    // checkbox is checked
    expect(checkbox).toBeChecked();
  });

  test('source is trusted initially', () => {
    mockGetItem.mockReturnValue('source-location');
    renderComponent('source-location');

    // no warning window
    const modal = screen.queryByRole('dialog');
    expect(modal).toBeNull();

    expect(mockOnContinue).toHaveBeenCalledTimes(1);
  });

  test('source is untrusted initially', async () => {
    mockGetItem.mockReturnValue('');
    const { reRenderComponent } = renderComponent('source-location');

    // warning window
    expect(screen.queryByRole('dialog')).not.toBeNull();

    expect(mockOnContinue).not.toHaveBeenCalled();

    mockGetItem.mockReturnValue('source-location');
    reRenderComponent('source-location');

    await waitFor(() => expect(mockOnContinue).toHaveBeenCalledTimes(1));
  });
});

function getComponent(location: string, isOpen = true): React.ReactElement {
  return (
    <UntrustedSourceModal
      location={location}
      isOpen={isOpen}
      onContinue={mockOnContinue}
      onClose={mockOnClose}
    />
  );
}
