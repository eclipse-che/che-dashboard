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

import React from 'react';
import { Provider } from 'react-redux';
import renderer, { ReactTestRendererJSON } from 'react-test-renderer';
import { render, RenderResult, screen } from '@testing-library/react';
import { WorkspaceDeleteAction } from '../';
import { WorkspaceStatus } from '../../../../services/helpers/types';
import { createFakeStore } from '../../../../store/__mocks__/store';

describe('Workspace delete component', () => {
  const workspaceId = 'workspace-test-id';

  it('should render delete widget enabled correctly', () => {
    const status = WorkspaceStatus.STOPPED;
    const disabled = false;
    const component = createComponent(status, disabled, workspaceId, jest.fn(), jest.fn());

    expect(getComponentSnapshot(component)).toMatchSnapshot();
  });

  it('should render delete widget disabled correctly', () => {
    const status = WorkspaceStatus.STOPPED;
    const disabled = false;
    const component = createComponent(status, disabled, workspaceId, jest.fn(), jest.fn());

    expect(getComponentSnapshot(component)).toMatchSnapshot();
  });

  it('should delete workspace on start correctly', () => {
    const status = WorkspaceStatus.STOPPED;
    const disabled = false;
    WorkspaceDeleteAction.shouldDelete.push(workspaceId);
    const deleteWorkspace = jest.fn();
    const stopWorkspace = jest.fn();

    renderComponent(createComponent(status, disabled, workspaceId, deleteWorkspace, stopWorkspace));

    expect(stopWorkspace).not.toBeCalled();
    expect(deleteWorkspace).toBeCalledWith(workspaceId);
  });

  it('should delete workspace if enable', () => {
    const status = WorkspaceStatus.STOPPED;
    const disabled = false;
    const deleteWorkspace = jest.fn();
    const stopWorkspace = jest.fn();

    renderComponent(createComponent(status, disabled, workspaceId, deleteWorkspace, stopWorkspace));

    expect(stopWorkspace).not.toBeCalled();
    expect(deleteWorkspace).not.toBeCalled();

    const deleteWorkspaceButton = screen.getByTestId(`delete-${workspaceId}`);
    deleteWorkspaceButton.click();

    const warningInfoCheckbox = screen.getByTestId('warning-info-checkbox');
    warningInfoCheckbox.click();

    const deleteWarningInfoButton = screen.getByTestId('delete-button');
    deleteWarningInfoButton.click();

    expect(stopWorkspace).not.toBeCalled();
    expect(deleteWorkspace).toBeCalledWith(workspaceId);
  });

  it('shouldn\'t delete workspace if disabled', () => {
    const status = WorkspaceStatus.STOPPED;
    const disabled = true;
    const deleteWorkspace = jest.fn();
    const stopWorkspace = jest.fn();

    renderComponent(createComponent(status, disabled, workspaceId, deleteWorkspace, stopWorkspace));

    expect(stopWorkspace).not.toBeCalled();
    expect(deleteWorkspace).not.toBeCalled();

    const deleteWorkspaceButton = screen.getByTestId(`delete-${workspaceId}`);
    deleteWorkspaceButton.click();

    expect(stopWorkspace).not.toBeCalled();
    expect(deleteWorkspace).not.toBeCalled();
  });

  it('shouldn\'t delete workspace without warning-info checkbox', () => {
    WorkspaceDeleteAction.shouldDelete.length = 0;
    const deleteWorkspace = jest.fn();
    const stopWorkspace = jest.fn();

    const status = WorkspaceStatus.RUNNING;

    renderComponent(createComponent(status, false, workspaceId, deleteWorkspace, stopWorkspace));

    expect(stopWorkspace).not.toBeCalled();
    expect(deleteWorkspace).not.toBeCalled();
    expect(WorkspaceDeleteAction.shouldDelete).toEqual([]);

    const getStartedTabButton = screen.getByTestId(`delete-${workspaceId}`);
    getStartedTabButton.click();

    const deleteWarningInfoButton = screen.getByTestId('delete-button');
    deleteWarningInfoButton.click();

    expect(deleteWorkspace).not.toBeCalled();
    expect(stopWorkspace).not.toBeCalled();
    expect(WorkspaceDeleteAction.shouldDelete).toEqual([]);
  });

  it('should stop workspace then delete if enable', () => {
    WorkspaceDeleteAction.shouldDelete.length = 0;
    let deleteWorkspace = jest.fn();
    let stopWorkspace = jest.fn();

    let status = WorkspaceStatus.RUNNING;

    const component = renderComponent(createComponent(status, false, workspaceId, deleteWorkspace, stopWorkspace));

    expect(stopWorkspace).not.toBeCalled();
    expect(deleteWorkspace).not.toBeCalled();
    expect(WorkspaceDeleteAction.shouldDelete).toEqual([]);

    const getStartedTabButton = screen.getByTestId(`delete-${workspaceId}`);
    getStartedTabButton.click();

    const warningInfoCheckbox = screen.getByTestId('warning-info-checkbox');
    warningInfoCheckbox.click();

    const deleteWarningInfoButton = screen.getByTestId('delete-button');
    deleteWarningInfoButton.click();

    expect(deleteWorkspace).not.toBeCalled();
    expect(stopWorkspace).toBeCalledWith(workspaceId);
    expect(WorkspaceDeleteAction.shouldDelete).toEqual([workspaceId]);

    status = WorkspaceStatus.STOPPED;
    deleteWorkspace = jest.fn();
    stopWorkspace = jest.fn();

    component.rerender(createComponent(status, false, workspaceId, deleteWorkspace, stopWorkspace));

    expect(stopWorkspace).not.toBeCalled();
    expect(deleteWorkspace).toBeCalledWith(workspaceId);
  });

});

function createComponent(
  workspaceStatus: WorkspaceStatus,
  disabled: boolean,
  workspaceId: string,
  deleteWorkspace: jest.Mock,
  stopWorkspace: jest.Mock,
): React.ReactElement {
  const store = createFakeStore([]);
  return (
    <Provider store={store}>
      <WorkspaceDeleteAction
        status={workspaceStatus}
        disabled={disabled}
        workspaceId={workspaceId}
        requestWorkspaces={jest.fn()}
        requestWorkspace={jest.fn()}
        startWorkspace={jest.fn()}
        stopWorkspace={async (id: string) => stopWorkspace(id)}
        deleteWorkspace={async (id: string) => deleteWorkspace(id)}
        updateWorkspace={jest.fn()}
        createWorkspaceFromDevfile={jest.fn()}
        requestSettings={jest.fn()}
        setWorkspaceQualifiedName={jest.fn()}
        clearWorkspaceQualifiedName={jest.fn()}
        setWorkspaceId={jest.fn()}
        clearWorkspaceId={jest.fn()}
        deleteWorkspaceLogs={jest.fn()}
      >Delete Workspace</WorkspaceDeleteAction>
    </Provider>
  );
}

function renderComponent(
  component: React.ReactElement
): RenderResult {
  return render(component);
}

function getComponentSnapshot(
  component: React.ReactElement
): null | ReactTestRendererJSON | ReactTestRendererJSON[] {
  return renderer.create(component).toJSON();
}
