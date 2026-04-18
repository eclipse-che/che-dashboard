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

import React from 'react';

import { BasicViewer } from '@/components/BasicViewer';
import getComponentRenderer from '@/services/__mocks__/getComponentRenderer';

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

describe('BasicViewer', () => {
  test('snapshot', () => {
    const snapshot = createSnapshot('line 1\nline 2\nline 3');
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  test('renders container with id', () => {
    renderComponent('line 1\nline 2\nline 3');

    const container = document.getElementById('basic-viewer-id');
    expect(container).toBeTruthy();
  });
});

function getComponent(value: string): React.ReactElement {
  return <BasicViewer id="basic-viewer-id" value={value} />;
}
