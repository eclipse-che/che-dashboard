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
import { RenderResult, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Nav } from '@patternfly/react-core';

import NavigationMainList from '../MainList';

describe('Navigation Main List', () => {

  function renderComponent(): RenderResult {
    return render(
      <MemoryRouter>
        <Nav
          onSelect={() => jest.fn()}
          theme="light"
        >
          <NavigationMainList activePath="" />
        </Nav>
      </MemoryRouter>
    );
  }

  it('should have correct number of main navigation items', () => {
    renderComponent();

    const navLinks = screen.getAllByRole('link');
    expect(navLinks.length).toEqual(2);
  });

  it('should have correct navigation item labels', () => {
    renderComponent();

    const navLinks = screen.getAllByRole('link');

    expect(navLinks[0]).toHaveTextContent('Get Started Page');
    expect(navLinks[1]).toHaveTextContent('Workspaces');
  });

});
