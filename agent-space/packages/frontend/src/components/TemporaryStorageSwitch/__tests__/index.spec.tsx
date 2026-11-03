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

import { Props, TemporaryStorageSwitch } from '@/components/TemporaryStorageSwitch';

function renderSwitch(props: Partial<Props> = {}) {
  const onChange = jest.fn();
  const result = render(
    <TemporaryStorageSwitch isTemporary={false} onChange={onChange} {...props} />,
  );
  return { ...result, onChange };
}

describe('TemporaryStorageSwitch', () => {
  it('is off while the sandbox gets a claim of its own', () => {
    renderSwitch();

    expect(screen.getByRole('switch', { name: /Temporary Storage/ })).not.toBeChecked();
  });

  it('is on once the storage is only as long-lived as the pod', () => {
    renderSwitch({ isTemporary: true });

    expect(screen.getByRole('switch', { name: /Temporary Storage/ })).toBeChecked();
  });

  it('reports a click at once, as the gallery has nothing to save against', async () => {
    const { onChange } = renderSwitch();

    await userEvent.click(screen.getByRole('switch', { name: /Temporary Storage/ }));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('reports the way back as well', async () => {
    const { onChange } = renderSwitch({ isTemporary: true });

    await userEvent.click(screen.getByRole('switch', { name: /Temporary Storage/ }));

    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('can be toggled with the keyboard', async () => {
    const { onChange } = renderSwitch();

    screen.getByRole('switch', { name: /Temporary Storage/ }).focus();
    await userEvent.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('stays put while a sandbox is being created', async () => {
    const { onChange } = renderSwitch({ isDisabled: true });

    const toggle = screen.getByRole('switch', { name: /Temporary Storage/ });
    expect(toggle).toBeDisabled();

    toggle.focus();
    await userEvent.keyboard('{Enter}');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('explains what temporary storage costs', async () => {
    renderSwitch();

    await userEvent.hover(screen.getByTestId('temporary-storage-info'));

    expect(
      await screen.findByText(/allows for faster I\/O but may have limited storage/),
    ).toBeInTheDocument();
  });
});
