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
import React from 'react';

import { ConditionsTable } from '@/components/ConditionsTable';

describe('ConditionsTable', () => {
  it('explains the empty state instead of rendering an empty table', () => {
    render(<ConditionsTable conditions={[]} />);

    expect(screen.getByTestId('no-conditions')).toBeInTheDocument();
    expect(screen.queryByTestId('conditions-table')).not.toBeInTheDocument();
  });

  it('renders one row per condition', () => {
    render(
      <ConditionsTable
        conditions={[
          {
            type: 'Ready',
            status: 'False',
            reason: 'Provisioning',
            message: 'Waiting for the sandbox pod to start.',
            lastTransitionTime: '2025-06-01T10:00:00Z',
          },
          { type: 'PodScheduled', status: 'True' },
        ]}
      />,
    );

    const rows = screen.getAllByRole('row');
    // One header row plus one row per condition.
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent('Ready');
    expect(rows[1]).toHaveTextContent('Provisioning');
    expect(rows[1]).toHaveTextContent('Waiting for the sandbox pod to start.');
  });

  it('shows a dash for the fields the controller left out', () => {
    render(<ConditionsTable conditions={[{ type: 'PodScheduled', status: 'Unknown' }]} />);

    const cells = screen.getAllByRole('cell');
    expect(cells[2]).toHaveTextContent('-');
    expect(cells[3]).toHaveTextContent('-');
    expect(cells[4]).toHaveTextContent('-');
  });
});
