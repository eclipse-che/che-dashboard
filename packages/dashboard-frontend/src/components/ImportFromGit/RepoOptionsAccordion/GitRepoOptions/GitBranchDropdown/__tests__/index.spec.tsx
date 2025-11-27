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

import userEvent from '@testing-library/user-event';
import React from 'react';

import { GitBranchDropdown } from '@/components/ImportFromGit/RepoOptionsAccordion/GitRepoOptions/GitBranchDropdown';
import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

const mockOnChange = jest.fn();

describe('GitBranchDropdown', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('snapshot', () => {
    const snapshot = createSnapshot();
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  test('git branch preset value', () => {
    renderComponent('preset-git-branch');

    const branch = screen.getByText('preset-git-branch');

    expect(branch).not.toBeNull();
  });

  test('git branch change', async () => {
    const gitBranch = 'branch';
    const gitBranchNew = 'new-branch';

    renderComponent(undefined, [gitBranch, gitBranchNew]);

    const dropdown = screen.getByRole('button');

    await userEvent.click(dropdown);
    await userEvent.click(screen.getByText(gitBranch));
    expect(mockOnChange).toHaveBeenNthCalledWith(1, gitBranch);

    await userEvent.click(dropdown);
    await userEvent.click(screen.getByText(gitBranchNew));
    expect(mockOnChange).toHaveBeenNthCalledWith(2, gitBranchNew);
  });

  test('empty git branch list', async () => {
    renderComponent();

    const error = screen.getByText('No branch found. Please check the Git repository URL.');

    expect(error).not.toBeNull();
  });
});

function getComponent(gitBranch?: string, branchList?: string[]) {
  return (
    <GitBranchDropdown gitBranch={gitBranch} branchList={branchList} onChange={mockOnChange} />
  );
}
