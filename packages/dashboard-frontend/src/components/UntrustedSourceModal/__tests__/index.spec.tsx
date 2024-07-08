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
import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';

const mockGet = jest.fn();
const mockUpdate = jest.fn();
jest.mock('@/services/session-storage', () => {
  return {
    __esModule: true,
    default: {
      get: (...args: unknown[]) => mockGet(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
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
      mockGet.mockReturnValue('repo1,repo2');
      expect(UntrustedSourceModal.isSourceTrusted('repo1')).toBeTruthy();
      expect(UntrustedSourceModal.isSourceTrusted('repo2')).toBeTruthy();
      expect(UntrustedSourceModal.isSourceTrusted('repo3')).toBeFalsy();
    });

    test('all sources are trusted', () => {
      mockGet.mockReturnValue('all');
      expect(UntrustedSourceModal.isSourceTrusted('repo1')).toBeTruthy();
    });
  });

  describe('updateTrustedSources', () => {
    test('trust all', () => {
      mockGet.mockReturnValue('repo1,repo2');
      UntrustedSourceModal.updateTrustedSources('repo1', true);
      expect(mockUpdate).toHaveBeenCalledWith('trusted-sources', 'all');
    });

    test('trust one', () => {
      mockGet.mockReturnValue('repo1,repo2');
      UntrustedSourceModal.updateTrustedSources('repo3', false);
      expect(mockUpdate).toHaveBeenCalledWith('trusted-sources', 'repo1,repo2,repo3');
    });
  });

  test('modal is hidden', () => {
    renderComponent('source-location', false);
    const modal = screen.queryByRole('dialog');
    expect(modal).toBeNull();
  });

  test('modal is visible', () => {
    mockGet.mockClear();
    renderComponent('source-location');
    const modal = screen.queryByRole('dialog');
    expect(modal).not.toBeNull();
  });

  test('close button is clicked', () => {
    renderComponent('source-location');
    const closeButton = screen.getByRole('button', { name: 'Close' });

    // button is enabled
    expect(closeButton).not.toBeDisabled();

    closeButton.click();
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('cancel button is clicked', () => {
    renderComponent('source-location');
    const closeButton = screen.getByRole('button', { name: 'Cancel' });

    // button is enabled
    expect(closeButton).not.toBeDisabled();

    closeButton.click();
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('continue button is clicked', () => {
    renderComponent('source-location');
    const continueButton = screen.getByRole('button', { name: 'Continue' });

    // button is enabled
    expect(continueButton).not.toBeDisabled();

    continueButton.click();
    expect(mockOnContinue).toHaveBeenCalledTimes(1);

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith('trusted-sources', 'source-location');
  });

  test('source is trusted', () => {
    mockGet.mockReturnValue('source-location');
    renderComponent('source-location');

    // no warning window
    const modal = screen.queryByRole('dialog');
    expect(modal).toBeNull();
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
