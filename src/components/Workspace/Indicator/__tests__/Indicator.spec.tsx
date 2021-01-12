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
import WorkspaceIndicator from '../';
import { WorkspaceStatus } from '../../../../services/helpers/types';

describe('Workspace indicator component', () => {

  it('should render STOPPED status correctly', () => {
    const status = WorkspaceStatus[WorkspaceStatus.STOPPED];

    const component = (<WorkspaceIndicator status={status} />);

    expect(getComponentSnapshot(component)).toMatchSnapshot();
  });

  it('should render STARTING status correctly', () => {
    const status = WorkspaceStatus[WorkspaceStatus.STARTING];

    const component = (<WorkspaceIndicator status={status} />);

    expect(getComponentSnapshot(component)).toMatchSnapshot();
  });

  it('should render RUNNING status correctly', () => {
    const status = WorkspaceStatus[WorkspaceStatus.RUNNING];

    const component = (<WorkspaceIndicator status={status} />);

    expect(getComponentSnapshot(component)).toMatchSnapshot();
  });

  it('should render ERROR status correctly', () => {
    const status = WorkspaceStatus[WorkspaceStatus.ERROR];

    const component = (<WorkspaceIndicator status={status} />);

    expect(getComponentSnapshot(component)).toMatchSnapshot();
  });

  it('should render STOPPING status correctly', () => {
    const status = WorkspaceStatus[WorkspaceStatus.STOPPING];

    const component = (<WorkspaceIndicator status={status} />);

    expect(getComponentSnapshot(component)).toMatchSnapshot();
  });

  it('should render PAUSED status correctly', () => {
    const status = WorkspaceStatus[WorkspaceStatus.PAUSED];

    const component = (<WorkspaceIndicator status={status} />);

    expect(getComponentSnapshot(component)).toMatchSnapshot();
  });

});

function getComponentSnapshot(
  component: React.ReactElement
): null | ReactTestRendererJSON | ReactTestRendererJSON[] {
  return renderer.create(component).toJSON();
}
