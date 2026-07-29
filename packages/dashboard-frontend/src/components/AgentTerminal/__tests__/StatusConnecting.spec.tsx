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

import StatusConnecting from '@/components/AgentTerminal/StatusConnecting';

describe('StatusConnecting', () => {
  test('should render without errors', () => {
    render(<StatusConnecting />);
    expect(screen.getByText('Connecting to agent...')).toBeDefined();
  });

  test('should contain the expected message text', () => {
    const { container } = render(<StatusConnecting />);
    expect(container.textContent).toBe('Connecting to agent...');
  });
});
