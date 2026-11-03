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

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { SandboxStatusLabel } from '@/components/SandboxStatusLabel';
import { Sandbox, SandboxCondition, SandboxPhase } from '@/services/types';

function buildSandbox(conditions: SandboxCondition[]): Sandbox {
  return {
    metadata: { name: 'test' },
    spec: { podTemplate: { spec: { containers: [] } } },
    status: { conditions },
  };
}

describe('SandboxStatusLabel', () => {
  it.each(Object.values(SandboxPhase))('renders the %s phase', phase => {
    render(<SandboxStatusLabel phase={phase} />);

    expect(screen.getByTestId('sandbox-status')).toHaveTextContent(phase);
  });

  it('renders a plain label when no sandbox is given', async () => {
    render(<SandboxStatusLabel phase={SandboxPhase.RUNNING} />);

    await userEvent.hover(screen.getByTestId('sandbox-status'));

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('explains a blocked sandbox on hover', async () => {
    const sandbox = buildSandbox([
      {
        type: 'PodScheduled',
        status: 'False',
        reason: 'Unschedulable',
        message: '0/1 nodes are available: 1 Insufficient memory.',
      },
      { type: 'Ready', status: 'False', reason: 'DependenciesNotReady' },
    ]);

    render(<SandboxStatusLabel phase={SandboxPhase.BLOCKED} sandbox={sandbox} />);
    await userEvent.hover(screen.getByTestId('sandbox-status'));

    await waitFor(() =>
      expect(screen.getByRole('tooltip')).toHaveTextContent(
        '0/1 nodes are available: 1 Insufficient memory.',
      ),
    );
  });

  it('falls back to the condition reason when there is no message', async () => {
    const sandbox = buildSandbox([{ type: 'Ready', status: 'True', reason: 'SandboxReady' }]);

    render(<SandboxStatusLabel phase={SandboxPhase.RUNNING} sandbox={sandbox} />);
    await userEvent.hover(screen.getByTestId('sandbox-status'));

    await waitFor(() => expect(screen.getByRole('tooltip')).toHaveTextContent('SandboxReady'));
  });

  it('renders a plain label when the sandbox has nothing to explain', async () => {
    render(<SandboxStatusLabel phase={SandboxPhase.PENDING} sandbox={buildSandbox([])} />);

    await userEvent.hover(screen.getByTestId('sandbox-status'));

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  /** The glyph the label draws in its icon slot. */
  function iconOf(): Element {
    const icon = screen.getByTestId('sandbox-status').querySelector('.pf-v6-c-label__icon > *');
    if (icon === null) {
      throw new Error('the label drew no icon');
    }
    return icon;
  }

  it.each([SandboxPhase.PENDING, SandboxPhase.TERMINATING])(
    'turns the glyph while the sandbox is %s',
    phase => {
      render(<SandboxStatusLabel phase={phase} />);

      expect(iconOf().getAttribute('class')).toContain('rotate');
    },
  );

  it('shows a still glyph once the sandbox has settled', () => {
    render(<SandboxStatusLabel phase={SandboxPhase.RUNNING} />);

    expect(iconOf().getAttribute('class')).not.toContain('rotate');
  });

  it('draws the in-progress glyph in the colour the label asked for', () => {
    // A PatternFly `Spinner` paints from a variable of its own rather than
    // from the label's icon slot, which left Pending drawing brand blue on a
    // blue label. An ordinary icon follows `currentColor` instead.
    render(<SandboxStatusLabel phase={SandboxPhase.PENDING} />);

    const icon = iconOf();
    expect(icon).not.toHaveClass('pf-v6-c-spinner');
    expect(icon.getAttribute('fill')).toEqual('currentColor');
  });

  it('matches the dashboard, which shows its workspace status in bold', () => {
    render(<SandboxStatusLabel phase={SandboxPhase.RUNNING} />);

    expect(screen.getByTestId('sandbox-status').getAttribute('class')).toContain('statusLabel');
  });
});
