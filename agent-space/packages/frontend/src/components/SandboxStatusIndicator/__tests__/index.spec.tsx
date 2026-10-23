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

import { SandboxStatusIndicator } from '@/components/SandboxStatusIndicator';
import { SandboxPhase } from '@/services/types';

describe('SandboxStatusIndicator', () => {
  it('names the agent space and its phase, as the glyph alone says nothing', () => {
    render(<SandboxStatusIndicator phase={SandboxPhase.RUNNING} sandboxName="my-agent" />);

    expect(screen.getByRole('img')).toHaveAttribute(
      'aria-label',
      'Agent space my-agent status is Running',
    );
  });

  it.each(Object.values(SandboxPhase))('shows a glyph for %s', phase => {
    render(<SandboxStatusIndicator phase={phase} sandboxName="my-agent" />);

    expect(screen.getByTestId('sandbox-status-indicator')).toBeInTheDocument();
  });

  it('spells the phase out on hover', async () => {
    render(<SandboxStatusIndicator phase={SandboxPhase.FAILED} sandboxName="my-agent" />);

    await userEvent.hover(screen.getByTestId('sandbox-status-indicator'));

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Failed');
  });
});
