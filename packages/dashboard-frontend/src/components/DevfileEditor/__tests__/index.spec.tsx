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

import { DevfileEditor } from '@/components/DevfileEditor';
import getComponentRenderer from '@/services/__mocks__/getComponentRenderer';

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

describe('DevfileEditor', () => {
  test('snapshot', () => {
    const snapshot = createSnapshot();
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  test('renders container with id', () => {
    renderComponent();

    const container = document.getElementById('test-editor');
    expect(container).toBeTruthy();
  });

  test('renders with the devfileEditor class', () => {
    renderComponent();

    const container = document.getElementById('test-editor');
    expect(container?.className).toContain('devfileEditor');
  });
});

function getComponent(): React.ReactElement {
  return (
    <DevfileEditor id="test-editor" value={'schemaVersion: 2.2.2\nmetadata:\n  name: test\n'} />
  );
}
