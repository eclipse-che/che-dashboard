/*
 * Copyright (c) 2018-2024 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import userEvent from '@testing-library/user-event';
import React from 'react';

import { WantDelete } from '@/contexts/WorkspaceActions';
import { WorkspaceActionsDeleteWarning } from '@/contexts/WorkspaceActions/DeleteWarning';
import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';

const { renderComponent } = getComponentRenderer(getComponent);

const mockOnClose = jest.fn();

describe('WorkspaceActionsDeleteWarning', () => {
  const oneWorkspace: WantDelete = ['workspace1'];
  const twoWorkspaces: WantDelete = ['workspace1', 'workspace2'];

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('modal is hidden', () => {
    renderComponent(false, oneWorkspace);

    expect(screen.queryByRole('dialog')).toBeFalsy();
  });

  describe('modal is visible', () => {
    test('one workspace text', () => {
      renderComponent(true, oneWorkspace);

      const dialog = screen.queryByRole('dialog');

      expect(dialog).toBeTruthy();
      expect(dialog).toHaveTextContent(
        `${oneWorkspace[0]} workspace has Per-user storage type. The Per-usertype e.g. one common PVC is used for all workspaces and that PVC has the RWO access mode. Learn more You need to stop other workspaces with Per-user storage type before deleting.`,
      );
    });

    test('two workspaces text', () => {
      renderComponent(true, twoWorkspaces);

      const dialog = screen.queryByRole('dialog');

      expect(dialog).toBeTruthy();
      expect(dialog).toHaveTextContent(
        `One of deleting workspaces has Per-user storage type. The Per-user type e.g. common PVC is used for all workspaces and that PVC has the RWO access mode. Learn more You need to stop other workspaces with Per-user storage type before deleting.`,
      );
    });
  });

  test('click on Close button', async () => {
    renderComponent(true, oneWorkspace);

    const closeButton = screen.queryByRole('button', { name: /close/i });

    expect(closeButton).toBeTruthy();

    await userEvent.click(closeButton!);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('click on Cancel button', async () => {
    renderComponent(true, oneWorkspace);

    const cancelButton = screen.queryByRole('button', { name: /cancel/i });

    expect(cancelButton).toBeTruthy();

    await userEvent.click(cancelButton!);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});

function getComponent(isOpen: boolean, wantDelete: [string, ...string[]]): React.ReactElement {
  return (
    <WorkspaceActionsDeleteWarning isOpen={isOpen} wantDelete={wantDelete} onClose={mockOnClose} />
  );
}
