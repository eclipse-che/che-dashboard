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

import { CheCopyToClipboard } from '@/components/CheCopyToClipboard';

describe('CheCopyToClipboard component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('should render copy button', () => {
    render(<CheCopyToClipboard text="test-text" />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('name', 'Copy to Clipboard');
  });

  test('should call onCopy callback when clicked', async () => {
    const user = userEvent.setup({ delay: null });
    const onCopy = jest.fn();
    render(<CheCopyToClipboard text="test-text" onCopy={onCopy} />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(onCopy).toHaveBeenCalledTimes(1);
  });

  test('should show initial tooltip text', async () => {
    const user = userEvent.setup({ delay: null });
    render(<CheCopyToClipboard text="test-text" />);

    const button = screen.getByRole('button');

    // Hover to see tooltip
    await user.hover(button);

    // Initial tooltip should say "Copy to clipboard"
    expect(screen.getByText(/copy to clipboard/i)).toBeInTheDocument();
  });

  test('should show "Copied!" tooltip after click', async () => {
    const user = userEvent.setup({ delay: null });
    const { container } = render(<CheCopyToClipboard text="test-text" />);

    const button = screen.getByRole('button');

    // Initially should show "Copy to clipboard"
    expect(container.textContent).toContain('Copy to clipboard');

    // Click the button
    await user.click(button);

    // After click, tooltip should say "Copied!"
    expect(container.textContent).toContain('Copied!');
  });

  test('should handle multiple clicks correctly', async () => {
    const user = userEvent.setup({ delay: null });
    const onCopy = jest.fn();
    const { container } = render(<CheCopyToClipboard text="test-text" onCopy={onCopy} />);

    const button = screen.getByRole('button');

    // Click multiple times
    await user.click(button);
    await user.click(button);
    await user.click(button);

    // Should call onCopy 3 times
    expect(onCopy).toHaveBeenCalledTimes(3);

    // Should still show "Copied!"
    expect(container.textContent).toContain('Copied!');
  });
});
