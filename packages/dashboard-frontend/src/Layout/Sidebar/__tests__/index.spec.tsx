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

import { PageContext, pageContextDefaults, PageContextProps } from '@patternfly/react-core';
import { render } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';

import { Sidebar } from '@/Layout/Sidebar';
import getComponentRenderer from '@/services/__mocks__/getComponentRenderer';

jest.mock('@/Layout/Navigation');

const { createSnapshot } = getComponentRenderer(getComponent);

describe('Sidebar', () => {
  test('snapshot - open', () => {
    expect(createSnapshot(true).toJSON()).toMatchSnapshot();
  });

  test('snapshot - closed', () => {
    expect(createSnapshot(false).toJSON()).toMatchSnapshot();
  });

  it('does not have inert attribute when the sidebar is open', () => {
    const { baseElement } = render(getComponent(true));
    const sidebar = baseElement.querySelector('#page-sidebar');
    expect(sidebar).not.toBeNull();
    expect(sidebar?.hasAttribute('inert')).toBe(false);
  });

  it('has inert attribute when the sidebar is collapsed', () => {
    const { baseElement } = render(getComponent(false));
    const sidebar = baseElement.querySelector('#page-sidebar');
    expect(sidebar).not.toBeNull();
    expect(sidebar?.hasAttribute('inert')).toBe(true);
  });
});

function getComponent(isSidebarOpen = true): React.ReactElement {
  const history = createMemoryHistory();
  const context: PageContextProps = { ...pageContextDefaults, isSidebarOpen };
  return (
    <PageContext.Provider value={context}>
      <Sidebar history={history} />
    </PageContext.Provider>
  );
}
