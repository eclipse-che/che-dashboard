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

import { GitBranchSelect } from '@/components/ImportFromGit/RepoOptionsAccordion/GitRepoOptions/GitBranchSelect';
import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

const mockOnChange = jest.fn();

describe('GitBranchSelect', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('snapshot', () => {
    const snapshot = createSnapshot();
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  test('git branch select preset', () => {
    renderComponent('preset-git-branch');

    const input = screen.getByRole('textbox');

    expect(input).toHaveValue('preset-git-branch');
  });

  test('git branch input preset', () => {
    renderComponent('preset-git-branch', ['branch']);

    const branch = screen.getByText('preset-git-branch');

    expect(branch).not.toBeNull();
  });

  test('git branch change', async () => {
    const gitBranch = 'branch';
    const gitBranchNew = 'new-branch';

    renderComponent(undefined, [gitBranch, gitBranchNew]);

    const select = screen.getByRole('button');

    await userEvent.click(select);
    await userEvent.click(screen.getByText(gitBranch));
    expect(mockOnChange).toHaveBeenNthCalledWith(1, gitBranch);

    await userEvent.click(select);
    await userEvent.click(screen.getByText(gitBranchNew));
    expect(mockOnChange).toHaveBeenNthCalledWith(2, gitBranchNew);
  });
});

function getComponent(gitBranch?: string, branchList?: string[]) {
  return <GitBranchSelect gitBranch={gitBranch} branchList={branchList} onChange={mockOnChange} />;
}
