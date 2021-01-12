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
import { Actions } from '../../../../../containers/WorkspaceDetails';
import { WorkspaceStatus } from '../../../../../services/helpers/types';

jest.mock('../../../../../containers/WorkspaceDetails', () => {
  enum Actions {
    OPEN = 'Open',
    OPEN_IN_VERBOSE_MODE = 'Open in verbose mode',
    START_IN_BACKGROUND = 'Start in background',
    STOP_WORKSPACE = 'Stop Workspace',
    DELETE_WORKSPACE = 'Delete Workspace',
  }

  return { Actions: Actions };
});

jest.mock('../../../../../components/Workspace/DeleteAction', () => {
  const FakeWorkspaceDeleteAction = React.forwardRef((props, ref) => (
    <button ref={ref as any}></button>
  ));
  FakeWorkspaceDeleteAction.displayName = 'WorkspaceDeleteAction';

  return FakeWorkspaceDeleteAction;
});

describe('Workspace actions widget', () => {
  const workspaceName = 'test-workspace-name';
  const workspaceId = 'test-workspace-id';
  const workspaceStatus = WorkspaceStatus.STOPPED;

  it('should call the callback with OPEN action', () => {
    const action = Actions.OPEN;
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
    const action = Actions.OPEN_IN_VERBOSE_MODE;
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
    const action = Actions.START_IN_BACKGROUND;
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
    const action = Actions.STOP_WORKSPACE;
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
    const action = Actions.STOP_WORKSPACE;
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
