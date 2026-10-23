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

import { ErrorAlert } from '@/components/ErrorAlert';
import { SandboxClientError } from '@/services/types';

describe('ErrorAlert', () => {
  it('renders nothing when there is no error', () => {
    const { container } = render(<ErrorAlert title="Failed" error={undefined} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the message of a plain error', () => {
    render(<ErrorAlert title="Failed to load sandboxes" error={new Error('Network down')} />);

    expect(screen.getByTestId('error-alert')).toHaveTextContent('Failed to load sandboxes');
    expect(screen.getByTestId('error-alert')).toHaveTextContent('Network down');
  });

  it.each([
    [401, 'session may have expired'],
    [403, 'do not have permission'],
    [404, 'CRDs may not be installed'],
    [409, 'Choose a different name'],
    [0, 'could not be reached from the browser'],
  ])('turns a %s into advice', (statusCode, advice) => {
    render(<ErrorAlert title="Failed" error={new SandboxClientError(statusCode, 'Boom.')} />);

    expect(screen.getByTestId('error-alert')).toHaveTextContent(advice);
  });

  it('shows the message as-is for an unmapped status code', () => {
    render(
      <ErrorAlert title="Failed" error={new SandboxClientError(500, 'Internal server error.')} />,
    );

    expect(screen.getByTestId('error-alert')).toHaveTextContent('Internal server error.');
  });

  it('surfaces the Kubernetes reason', () => {
    render(
      <ErrorAlert title="Failed" error={new SandboxClientError(404, 'Not found.', 'NotFound')} />,
    );

    expect(screen.getByTestId('error-alert')).toHaveTextContent('Reason: NotFound');
  });

  it('is dismissible only when a close handler is given', async () => {
    const onClose = jest.fn();
    const { rerender } = render(<ErrorAlert title="Failed" error={new Error('Boom')} />);

    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();

    rerender(<ErrorAlert title="Failed" error={new Error('Boom')} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
