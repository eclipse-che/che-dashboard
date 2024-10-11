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

import React from 'react';

import { PureSubCondition } from '@/components/WorkspaceProgress/StartingSteps/WorkspaceConditions/PureSubCondition';
import getComponentRenderer from '@/services/__mocks__/getComponentRenderer';

const { createSnapshot } = getComponentRenderer(getComponent);

describe('Starting sub-steps, checking rendering', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should not render without title', () => {
    const snapshot = createSnapshot(undefined);
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  it('should render with a title correctly', () => {
    const snapshot = createSnapshot('Test sub-step...');
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  it('should render with a title and `distance=1` correctly', () => {
    const snapshot = createSnapshot('Test sub-step...distance=1', 1);
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  it('should render with a title and `distance=0` correctly', () => {
    const snapshot = createSnapshot('Test sub-step...distance=0', 0);
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  it('should render with a title and `distance=-1` correctly', () => {
    const snapshot = createSnapshot('Test sub-step...distance=-1', -1);
    expect(snapshot.toJSON()).toMatchSnapshot();
  });
});

function getComponent(title: string | undefined, distance?: -1 | 0 | 1): React.ReactElement {
  return <PureSubCondition title={title} distance={distance} />;
}
