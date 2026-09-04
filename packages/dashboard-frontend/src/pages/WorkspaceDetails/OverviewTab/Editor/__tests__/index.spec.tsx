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

import { container } from '@/inversify.config';
import { EditorFormGroup } from '@/pages/WorkspaceDetails/OverviewTab/Editor';
import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';
import { AppAlerts } from '@/services/alerts/appAlerts';
import { AlertItem } from '@/services/helpers/types';
import { che } from '@/services/models';
import { constructWorkspace, Workspace } from '@/services/workspace-adapter';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';

jest.mock('@/pages/WorkspaceDetails/OverviewTab/Editor/SelectorModal');

const mockShowAlert = jest.fn();
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

beforeEach(() => {
  class MockAppAlerts extends AppAlerts {
    showAlert(alert: AlertItem): void {
      mockShowAlert(alert);
    }
  }
  container.snapshot();
  container.rebind(AppAlerts).to(MockAppAlerts).inSingletonScope();
});

afterEach(() => {
  jest.clearAllMocks();
  container.restore();
});

describe('EditorFormGroup', () => {
  it('shows "Default" when no editor annotation is set', () => {
    renderComponent(false, buildWorkspace());
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('shows the editor display name without version', () => {
    renderComponent(false, buildWorkspace('che-incubator/che-code/latest'));
    expect(screen.getByText('VS Code - Open Source')).toBeInTheDocument();
  });

  it('pencil button is not rendered when readonly is true', () => {
    renderComponent(true, buildWorkspace('che-incubator/che-code/latest'));
    expect(screen.queryByRole('button', { name: /Change editor/i })).not.toBeInTheDocument();
  });

  it('pencil button is rendered and enabled when readonly is false', () => {
    renderComponent(false, buildWorkspace('che-incubator/che-code/latest'));
    expect(screen.getByRole('button', { name: /Change editor/i })).not.toBeDisabled();
  });

  it('opens the selector modal when pencil button is clicked', async () => {
    renderComponent(false, buildWorkspace('che-incubator/che-code/latest'));
    expect(screen.queryByTestId('mock-editor-selector-modal')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Change editor/i }));
    expect(screen.getByTestId('mock-editor-selector-modal')).toBeInTheDocument();
  });

  it('calls changeEditor and shows success alert on confirm', async () => {
    const workspace = buildWorkspace('che-incubator/che-code/latest');
    renderComponent(false, workspace);
    await userEvent.click(screen.getByRole('button', { name: /Change editor/i }));
    await userEvent.click(screen.getByRole('button', { name: /Confirm Editor/i }));
    expect(mockChangeEditor).toHaveBeenCalledWith(workspace, 'che-incubator/che-code/latest');
    expect(mockShowAlert).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'success', title: 'Workspace has been updated' }),
    );
  });

  it('shows danger alert when changeEditor throws', async () => {
    mockChangeEditor.mockRejectedValueOnce(new Error('patch failed'));
    renderComponent(false, buildWorkspace('che-incubator/che-code/latest'));
    await userEvent.click(screen.getByRole('button', { name: /Change editor/i }));
    await userEvent.click(screen.getByRole('button', { name: /Confirm Editor/i }));
    expect(mockShowAlert).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'danger', title: 'patch failed' }),
    );
  });

  it('closes the modal without calling changeEditor when Close Modal is clicked', async () => {
    renderComponent(false, buildWorkspace('che-incubator/che-code/latest'));
    await userEvent.click(screen.getByRole('button', { name: /Change editor/i }));
    await userEvent.click(screen.getByRole('button', { name: /Close Modal/i }));
    expect(mockChangeEditor).not.toHaveBeenCalled();
    expect(screen.queryByTestId('mock-editor-selector-modal')).not.toBeInTheDocument();
  });
});
