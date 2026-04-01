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
import { Provider } from 'react-redux';

import { NavigationRecentItemObject } from '@/Layout/Navigation';
import { RecentItemWorkspaceActions } from '@/Layout/Navigation/RecentItem/WorkspaceActions';
import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';
import { constructWorkspace } from '@/services/workspace-adapter';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';

jest.mock('@/contexts/WorkspaceActions/Dropdown');

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

let item: NavigationRecentItemObject;

beforeEach(() => {
  const workspace = constructWorkspace(
    new DevWorkspaceBuilder()
      .withName('my-workspace')
      .withUID('1234')
      .withStatus({ phase: 'STOPPED' })
      .build(),
  );
  item = { label: 'my-workspace', to: '/namespace/my-workspace', workspace };
});

describe('RecentItemWorkspaceActions', () => {
  test('snapshot when not hovered or focused', () => {
    const snapshot = createSnapshot(item, false, false);
    expect(snapshot).toMatchSnapshot();
  });

  test('hidden when parent is not hovered and not focused', () => {
    renderComponent(item, false, false);
    const container = screen.getByTestId('workspace-actions-dropdown').parentElement!;
    expect(container).toHaveStyle({ visibility: 'hidden' });
  });

  test('visible when parent is hovered', () => {
    renderComponent(item, true, false);
    const container = screen.getByTestId('workspace-actions-dropdown').parentElement!;
    expect(container).toHaveStyle({ visibility: 'visible' });
  });

  test('visible when parent has keyboard focus', () => {
    renderComponent(item, false, true);
    const container = screen.getByTestId('workspace-actions-dropdown').parentElement!;
    expect(container).toHaveStyle({ visibility: 'visible' });
  });
});

function getComponent(
  item: NavigationRecentItemObject,
  isParentHovered: boolean,
  isParentFocused: boolean,
): React.ReactElement {
  const store = new MockStoreBuilder().build();
  return (
    <Provider store={store}>
      <RecentItemWorkspaceActions
        item={item}
        isParentHovered={isParentHovered}
        isParentFocused={isParentFocused}
      />
    </Provider>
  );
}
