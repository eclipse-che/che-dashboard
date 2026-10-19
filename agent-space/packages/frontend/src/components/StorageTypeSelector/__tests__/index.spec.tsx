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

import { Props, StorageTypeSelector } from '@/components/StorageTypeSelector';

function renderSelector(props: Partial<Props> = {}) {
  const onChange = jest.fn();
  const result = render(
    <StorageTypeSelector storageType="per-sandbox" onChange={onChange} {...props} />,
  );
  return { ...result, onChange };
}

describe('StorageTypeSelector', () => {
  it('shows the type the sandbox has', () => {
    renderSelector();

    expect(screen.getByTestId('storage-type-selector')).toHaveTextContent('Per-sandbox');
  });

  it('opens the dialog on the pencil', async () => {
    renderSelector();

    await userEvent.click(screen.getByTestId('storage-type-edit-toggle'));

    expect(screen.getByText('Change Storage Type')).toBeInTheDocument();
  });

  it('reports the type the user saved', async () => {
    const { onChange } = renderSelector();

    await userEvent.click(screen.getByTestId('storage-type-edit-toggle'));
    await userEvent.click(screen.getByRole('radio', { name: /Ephemeral/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onChange).toHaveBeenCalledWith('ephemeral');
  });

  it('reports nothing when the dialog is cancelled', async () => {
    const { onChange } = renderSelector();

    await userEvent.click(screen.getByTestId('storage-type-edit-toggle'));
    await userEvent.click(screen.getByRole('radio', { name: /Ephemeral/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('reopens on what the sandbox carries, not on what was cancelled', async () => {
    renderSelector();

    await userEvent.click(screen.getByTestId('storage-type-edit-toggle'));
    await userEvent.click(screen.getByRole('radio', { name: /Ephemeral/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await userEvent.click(screen.getByTestId('storage-type-edit-toggle'));

    expect(screen.getByRole('radio', { name: /Per-sandbox/ })).toBeChecked();
  });

  it('keeps Save disabled until the selection differs', async () => {
    renderSelector();

    await userEvent.click(screen.getByTestId('storage-type-edit-toggle'));

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('warns that the data may not survive the change', async () => {
    renderSelector();

    await userEvent.click(screen.getByTestId('storage-type-edit-toggle'));

    expect(
      screen.getByText('Note that after changing the storage type you may lose the sandbox data.'),
    ).toBeInTheDocument();
  });

  it('says why the pencil is disabled', () => {
    renderSelector({ isDisabled: true, disabledReason: 'Suspend the sandbox first.' });

    expect(screen.getByTestId('storage-type-edit-toggle')).toBeDisabled();
    expect(screen.getByTestId('storage-type-disabled-reason')).toHaveTextContent(
      'Suspend the sandbox first.',
    );
  });
});
