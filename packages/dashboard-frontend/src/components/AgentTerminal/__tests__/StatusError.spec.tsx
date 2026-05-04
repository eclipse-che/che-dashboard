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

import StatusError from '@/components/AgentTerminal/StatusError';

describe('StatusError', () => {
  test('should render without errors', () => {
    render(<StatusError />);
    expect(screen.getByText('Failed to load terminal')).toBeDefined();
  });

  test('should contain the expected error message text', () => {
    const { container } = render(<StatusError />);
    expect(container.textContent).toBe('Failed to load terminal');
  });
});
