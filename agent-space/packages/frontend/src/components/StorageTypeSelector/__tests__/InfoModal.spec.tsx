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

import { StorageTypeInfoModal } from '@/components/StorageTypeSelector/InfoModal';

describe('StorageTypeInfoModal', () => {
  it('stays out of the way while it is closed', () => {
    render(<StorageTypeInfoModal isOpen={false} onClose={jest.fn()} />);

    expect(screen.queryByTestId('storage-type-info-modal')).toBeNull();
  });

  it('explains both types and where they are mounted', () => {
    render(<StorageTypeInfoModal isOpen={true} onClose={jest.fn()} />);

    expect(screen.getByText('Storage Type Info')).toBeInTheDocument();
    expect(screen.getByText('Per-sandbox Storage')).toBeInTheDocument();
    expect(screen.getByText('Ephemeral Storage')).toBeInTheDocument();
    expect(screen.getAllByText('/workspace').length).toBeGreaterThan(0);
  });
});
