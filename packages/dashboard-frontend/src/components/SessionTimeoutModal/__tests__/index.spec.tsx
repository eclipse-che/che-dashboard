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

import { cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import SessionTimeoutModal from '@/components/SessionTimeoutModal';
import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';

// PF6 Modal uses React portals which are incompatible with react-test-renderer.
// Replace it with a simple inline renderer so snapshots and interactions work.
jest.mock('@patternfly/react-core', () => {
  const actual =
    jest.requireActual<typeof import('@patternfly/react-core')>('@patternfly/react-core');
  return {
    ...actual,
    Modal: ({ isOpen, children }: { isOpen: boolean; children?: React.ReactNode }) =>
      isOpen ? <div data-testid="modal">{children}</div> : null,
    ModalHeader: ({ title }: { title: string }) => <div data-testid="modal-header">{title}</div>,
    ModalBody: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="modal-body">{children}</div>
    ),
    ModalFooter: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="modal-footer">{children}</div>
    ),
  };
});

const mockOnExtend = jest.fn();
const mockOnSignOut = jest.fn();

let mockIsOpen = false;
let mockCountdown = 60;

jest.mock('@/services/session/useSessionTimeout', () => ({
  useSessionTimeout: () => ({
    isModalOpen: mockIsOpen,
    countdown: mockCountdown,
    onExtend: mockOnExtend,
    onSignOut: mockOnSignOut,
  }),
}));

const { createSnapshot, renderComponent } = getComponentRenderer(() =>
  React.createElement(SessionTimeoutModal, null),
);

describe('SessionTimeoutModal', () => {
  beforeEach(() => {
    mockIsOpen = false;
    mockCountdown = 60;
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  test('snapshot — modal closed', () => {
    expect(createSnapshot().toJSON()).toMatchSnapshot();
  });

  test('snapshot — modal open at 45 s', () => {
    mockIsOpen = true;
    mockCountdown = 45;
    const instance = createSnapshot();
    expect(instance.toJSON()).toMatchSnapshot();
    instance.unmount();
  });

  test('snapshot — urgent state at 15 s', () => {
    mockIsOpen = true;
    mockCountdown = 15;
    const instance = createSnapshot();
    expect(instance.toJSON()).toMatchSnapshot();
    instance.unmount();
  });

  it('shows countdown value when open', () => {
    mockIsOpen = true;
    mockCountdown = 42;
    renderComponent();
    expect(screen.getByText('42')).toBeTruthy();
  });

  it('"Extend session" button calls onExtend', async () => {
    mockIsOpen = true;
    renderComponent();
    await userEvent.click(screen.getByRole('button', { name: /extend session/i }));
    expect(mockOnExtend).toHaveBeenCalledTimes(1);
  });

  it('"Sign out now" button calls onSignOut', async () => {
    mockIsOpen = true;
    renderComponent();
    await userEvent.click(screen.getByRole('button', { name: /sign out now/i }));
    expect(mockOnSignOut).toHaveBeenCalledTimes(1);
  });

  it('Space key calls onExtend', () => {
    mockIsOpen = true;
    renderComponent();
    fireEvent.keyDown(document, { key: ' ' });
    expect(mockOnExtend).toHaveBeenCalledTimes(1);
  });

  it('Space key does NOT call onExtend when modal is closed', () => {
    mockIsOpen = false;
    renderComponent();
    fireEvent.keyDown(document, { key: ' ' });
    expect(mockOnExtend).not.toHaveBeenCalled();
  });
});
