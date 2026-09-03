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

import { EditorFormGroup } from '@/pages/WorkspaceDetails/OverviewTab/Editor';
import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';
import { che } from '@/services/models';
import { constructWorkspace, Workspace } from '@/services/workspace-adapter';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';

jest.mock('@/pages/WorkspaceDetails/OverviewTab/Editor/SelectorModal');

const { renderComponent } = getComponentRenderer(getComponent);

function makePlugin(
  publisher: string,
  name: string,
  version: string,
  displayName: string,
): che.Plugin {
  return {
    id: `${publisher}/${name}/${version}`,
    name,
    publisher,
    displayName,
    type: 'Che Editor',
    version,
    icon: '<svg/>',
    iconMediatype: 'image/svg+xml',
    links: { devfile: '' },
  };
}

const editors = [
  makePlugin('che-incubator', 'che-code', 'latest', 'VS Code - Open Source'),
  makePlugin('che-incubator', 'che-idea-server', 'latest', 'JetBrains IntelliJ IDEA'),
];

const mockChangeEditor = jest.fn().mockResolvedValue(undefined);

function buildWorkspace(editorId?: string): Workspace {
  const builder = new DevWorkspaceBuilder();
  if (editorId) {
    builder.withMetadata({ annotations: { 'che.eclipse.org/che-editor': editorId } });
  }
  return constructWorkspace(builder.build());
}

function getComponent(readonly: boolean, workspace: Workspace): React.ReactElement {
  return (
    <EditorFormGroup
      readonly={readonly}
      workspace={workspace}
      editors={editors}
      currentArchitecture={undefined}
      changeEditor={mockChangeEditor}
    />
  );
}

beforeEach(() => jest.clearAllMocks());

describe('EditorFormGroup', () => {
  it('shows "Default" when no editor annotation is set', () => {
    renderComponent(false, buildWorkspace());
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('shows the editor display name and version', () => {
    renderComponent(false, buildWorkspace('che-incubator/che-code/latest'));
    expect(screen.getByText('VS Code - Open Source · latest')).toBeInTheDocument();
  });

  it('pencil button is disabled when readonly is true', () => {
    renderComponent(true, buildWorkspace('che-incubator/che-code/latest'));
    expect(screen.getByRole('button', { name: /Change editor/i })).toBeDisabled();
  });

  it('pencil button is enabled when readonly is false', () => {
    renderComponent(false, buildWorkspace('che-incubator/che-code/latest'));
    expect(screen.getByRole('button', { name: /Change editor/i })).not.toBeDisabled();
  });

  it('opens the selector modal when pencil button is clicked', async () => {
    renderComponent(false, buildWorkspace('che-incubator/che-code/latest'));
    expect(screen.queryByTestId('mock-editor-selector-modal')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Change editor/i }));
    expect(screen.getByTestId('mock-editor-selector-modal')).toBeInTheDocument();
  });

  it('calls changeEditor with the selected editor id when confirm is clicked', async () => {
    const workspace = buildWorkspace('che-incubator/che-code/latest');
    renderComponent(false, workspace);
    await userEvent.click(screen.getByRole('button', { name: /Change editor/i }));
    await userEvent.click(screen.getByRole('button', { name: /Confirm Editor/i }));
    expect(mockChangeEditor).toHaveBeenCalledTimes(1);
    expect(mockChangeEditor).toHaveBeenCalledWith(workspace, 'che-incubator/che-code/latest');
  });

  it('closes the modal without calling changeEditor when Close Modal is clicked', async () => {
    renderComponent(false, buildWorkspace('che-incubator/che-code/latest'));
    await userEvent.click(screen.getByRole('button', { name: /Change editor/i }));
    await userEvent.click(screen.getByRole('button', { name: /Close Modal/i }));
    expect(mockChangeEditor).not.toHaveBeenCalled();
    expect(screen.queryByTestId('mock-editor-selector-modal')).not.toBeInTheDocument();
  });
});
