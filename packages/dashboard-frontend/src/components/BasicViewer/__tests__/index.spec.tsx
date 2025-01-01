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

import { BasicViewer } from '@/components/BasicViewer';
import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

describe('BasicViewer', () => {
  test('snapshot', () => {
    const snapshot = createSnapshot('line 1\nline 2\nline 3');
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  test('handle content change', () => {
    const { reRenderComponent } = renderComponent('line 1\nline 2\nline 3');

    const textbox = screen.getByRole('textbox');

    // no new line character
    expect(textbox).toHaveTextContent('line 1 line 2 line 3');

    reRenderComponent('line 4\nline 5\nline 6');

    // no new line character
    expect(textbox).toHaveTextContent('line 4 line 5 line 6');
  });
});

function getComponent(value: string): React.ReactElement {
  return <BasicViewer id="basic-viewer-id" value={value} />;
}
