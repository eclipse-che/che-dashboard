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

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { DeleteSandboxModal, Props } from '@/components/DeleteSandboxModal';

function renderModal(props: Partial<Props> = {}) {
  const onConfirm = jest.fn();
  const onClose = jest.fn();
  const result = render(
    <DeleteSandboxModal
      isOpen={true}
      sandboxNames={['hello-world']}
      onConfirm={onConfirm}
      onClose={onClose}
      {...props}
    />,
  );
  return { ...result, onConfirm, onClose };
}

describe('DeleteSandboxModal', () => {
  it('stays closed until asked to open', () => {
    renderModal({ isOpen: false });

    expect(screen.queryByTestId('delete-sandbox-button')).not.toBeInTheDocument();
  });

  it('names the agent space being deleted', () => {
    renderModal();

    expect(screen.getByRole('dialog')).toHaveTextContent('delete the agent space "hello-world"');
  });

  it('lists every agent space of a bulk deletion', () => {
    renderModal({ sandboxNames: ['one', 'two', 'three'] });

    expect(screen.getByRole('dialog')).toHaveTextContent('delete 3 agent spaces');
    expect(screen.getByTestId('delete-sandbox-names')).toHaveTextContent('one');
    expect(screen.getByTestId('delete-sandbox-names')).toHaveTextContent('three');
  });

  it('keeps Delete disabled until the warning is acknowledged', async () => {
    const { onConfirm } = renderModal();

    expect(screen.getByTestId('delete-sandbox-button')).toBeDisabled();

    await userEvent.click(screen.getByTestId('confirmation-checkbox'));

    expect(screen.getByTestId('delete-sandbox-button')).toBeEnabled();

    await userEvent.click(screen.getByTestId('delete-sandbox-button'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('closes on Cancel without deleting', async () => {
    const { onConfirm, onClose } = renderModal();

    await userEvent.click(screen.getByTestId('close-button'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('keeps Delete disabled while the deletion is in flight', async () => {
    renderModal({ isDeleting: true });

    await userEvent.click(screen.getByTestId('confirmation-checkbox'));

    expect(screen.getByTestId('delete-sandbox-button')).toBeDisabled();
  });

  it('forgets the acknowledgement after the modal is closed', async () => {
    const { rerender } = renderModal();
    await userEvent.click(screen.getByTestId('confirmation-checkbox'));

    rerender(
      <DeleteSandboxModal
        isOpen={false}
        sandboxNames={['hello-world']}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    rerender(
      <DeleteSandboxModal
        isOpen={true}
        sandboxNames={['other-sandbox']}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByTestId('confirmation-checkbox')).not.toBeChecked();
    expect(screen.getByTestId('delete-sandbox-button')).toBeDisabled();
  });
});
