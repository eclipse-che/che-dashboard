/*
 * Copyright (c) 2018-2020 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { render, RenderResult, screen } from '@testing-library/react';
import React from 'react';
import { HeaderActionSelect } from '../';
import { WorkspaceAction, WorkspaceStatus } from '../../../../../services/helpers/types';

jest.mock('../../../../../components/Workspace/DeleteAction', () => {
  const FakeWorkspaceDeleteAction = React.forwardRef((props, ref) => (
    <button ref={ref as any}></button>
  ));
  FakeWorkspaceDeleteAction.displayName = 'WorkspaceDeleteAction';

  return FakeWorkspaceDeleteAction;
});

describe('Workspace WorkspaceAction widget', () => {
  const workspaceName = 'test-workspace-name';
  const workspaceId = 'test-workspace-id';
  const workspaceStatus = WorkspaceStatus.STOPPED;

  it('should call the callback with OPEN action', () => {
    const action = WorkspaceAction.OPEN_IDE;
    const onAction = jest.fn();
    const component = createComponent(workspaceStatus, workspaceName, workspaceId, onAction);

    renderComponent(component);

    const actionDropdown = screen.getByTestId(`${workspaceId}-action-dropdown`);
    actionDropdown.click();

    expect(onAction).not.toBeCalled();

    const targetAction = screen.getByText(action);
    targetAction.click();

    expect(onAction).toBeCalledWith(action);
  });

  it('should call the callback with OPEN_IN_VERBOSE_MODE action', () => {
    const action = WorkspaceAction.START_DEBUG_AND_OPEN_LOGS;
    const onAction = jest.fn();
    const component = createComponent(workspaceStatus, workspaceName, workspaceId, onAction);

    renderComponent(component);

    const actionDropdown = screen.getByTestId(`${workspaceId}-action-dropdown`);
    actionDropdown.click();

    expect(onAction).not.toBeCalled();

    const targetAction = screen.getByText(action);
    targetAction.click();

    expect(onAction).toBeCalledWith(action);
  });

  it('should call the callback with START_IN_BACKGROUND action', () => {
    const action = WorkspaceAction.START_IN_BACKGROUND;
    const onAction = jest.fn();
    const component = createComponent(workspaceStatus, workspaceName, workspaceId, onAction);

    renderComponent(component);

    const actionDropdown = screen.getByTestId(`${workspaceId}-action-dropdown`);
    actionDropdown.click();

    expect(onAction).not.toBeCalled();

    const targetAction = screen.getByText(action);
    targetAction.click();

    expect(onAction).toBeCalledWith(action);
  });

  it('shouldn\'t call the callback with STOP_WORKSPACE action if disabled', () => {
    const action = WorkspaceAction.STOP_WORKSPACE;
    const onAction = jest.fn();

    renderComponent(createComponent(workspaceStatus, workspaceName, workspaceId, onAction));

    const actionDropdown = screen.getByTestId(`${workspaceId}-action-dropdown`);
    actionDropdown.click();

    expect(onAction).not.toBeCalled();

    const targetAction = screen.getByText(action);
    targetAction.click();

    expect(onAction).not.toBeCalledWith(action);
  });

  it('should call the callback with STOP_WORKSPACE action', () => {
    const action = WorkspaceAction.STOP_WORKSPACE;
    const workspaceStatus = WorkspaceStatus.RUNNING;
    const onAction = jest.fn();

    renderComponent(createComponent(workspaceStatus, workspaceName, workspaceId, onAction));

    const actionDropdown = screen.getByTestId(`${workspaceId}-action-dropdown`);
    actionDropdown.click();

    expect(onAction).not.toBeCalled();

    const targetAction = screen.getByText(action);
    targetAction.click();

    expect(onAction).toBeCalledWith(action);
  });
});

function createComponent(
  workspaceStatus: WorkspaceStatus,
  workspaceName: string,
  workspaceId: string,
  onAction: jest.Mock,
): React.ReactElement {
  return (
    <HeaderActionSelect
      onAction={onAction}
      workspaceId={workspaceId}
      workspaceName={workspaceName}
      status={WorkspaceStatus[workspaceStatus]} />
  );
}

function renderComponent(
  component: React.ReactElement
): RenderResult {
  return render(component);
}
