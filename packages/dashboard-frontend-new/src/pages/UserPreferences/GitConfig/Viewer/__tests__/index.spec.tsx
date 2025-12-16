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

import { GitConfigViewer } from '@/pages/UserPreferences/GitConfig/Viewer';
import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';
import { GitConfig } from '@/store/GitConfig';

jest.mock('@/components/BasicViewer');

const { renderComponent } = getComponentRenderer(getComponent);

describe('GitConfigViewer', () => {
  test('viewer content', () => {
    const config: GitConfig = {
      user: {
        name: 'John Doe',
        email: 'johndoe@example.com',
      },
    };
    renderComponent(config);

    const viewerContent = screen.getByRole('textbox');
    expect(viewerContent).toHaveTextContent('[user] name="John Doe" email="johndoe@example.com"');
  });
});

function getComponent(config: GitConfig) {
  return <GitConfigViewer config={config} />;
}
