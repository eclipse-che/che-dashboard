/*
 * Copyright (c) 2018-2023 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import React from 'react';
import { PersonalAccessTokenEmptyState } from '..';
import getComponentRenderer, {
  fireEvent,
  screen,
} from '../../../../../services/__mocks__/getComponentRenderer';

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

const mockOnAddToken = jest.fn();

describe('EmptyState', () => {
  it('should match the snapshot', () => {
    const snapshot = createSnapshot();
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  it('should handle add token', () => {
    renderComponent();

    expect(mockOnAddToken).not.toHaveBeenCalled();

    const button = screen.getByRole('button', { name: 'Add Personal Access Token' });
    fireEvent.click(button);

    expect(mockOnAddToken).toHaveBeenCalled();
  });
});

function getComponent(): React.ReactElement {
  return <PersonalAccessTokenEmptyState onAddToken={mockOnAddToken} />;
}
