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
import renderer, { ReactTestRendererJSON } from 'react-test-renderer';
import { WorkspaceStatus } from '../../../../services/helpers/types';
import { HeaderActionSelect } from '../Actions';
import Header from '../index';

jest.mock('../../../../containers/WorkspaceDetails', () => {
  return { Actions: {} };
});

describe('Workspace details header widget', () => {
  const workspaceName = 'test-workspace-name';
  const workspaceId = 'test-workspace-id';

  it('should render STOPPED status correctly', () => {
    const status = WorkspaceStatus.STOPPED;

    const component = createComponent(status, workspaceName, workspaceId);

    expect(getComponentSnapshot(component)).toMatchSnapshot();
  });

  it('should render RUNNING status correctly', () => {
    const status = WorkspaceStatus.RUNNING;

    const component = createComponent(status, workspaceName, workspaceId);

    expect(getComponentSnapshot(component)).toMatchSnapshot();
  });

});

function createComponent(
  workspaceStatus: WorkspaceStatus,
  workspaceName: string,
  workspaceId: string,
): React.ReactElement {
  return (
    <Header workspaceName={workspaceName} status={WorkspaceStatus[workspaceStatus]}>
      <HeaderActionSelect
        onAction={jest.fn()}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        status={WorkspaceStatus[workspaceStatus]} />
    </Header>
  );
}

function getComponentSnapshot(
  component: React.ReactElement
): null | ReactTestRendererJSON | ReactTestRendererJSON[] {
  return renderer.create(component).toJSON();
}
