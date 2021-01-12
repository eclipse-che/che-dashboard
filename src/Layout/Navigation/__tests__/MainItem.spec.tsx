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
import { render, screen, RenderResult } from '@testing-library/react';
import { HomeIcon } from '@patternfly/react-icons';
import { MemoryRouter } from 'react-router';

import NavigationMainItem from '../MainItem';
import { NavigationItemObject } from '..';

describe('Navigation Item', () => {

  let activeItem = '';
  const item: NavigationItemObject = {
    icon: <HomeIcon />,
    label: 'Home',
    to: '/home',
  };

  function renderComponent(): RenderResult {
    return render(
      <MemoryRouter>
        <NavigationMainItem
          item={item}
          activePath={activeItem}
        >
          {item.icon}
        </NavigationMainItem>
      </MemoryRouter>
    );
  }

  it('should have correct label', () => {
    renderComponent();

    const link = screen.getByRole('link');
    expect(link).toHaveTextContent('Home');
  });

  describe('activation', () => {

    it('should render not active navigation item', () => {
      renderComponent();

      const link = screen.getByRole('link');
      expect(link).not.toHaveAttribute('aria-current');
    });

    it('should render active navigation item', () => {
      activeItem = '/home';
      renderComponent();

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('aria-current');
    });

    it('should activate navigation item on props change', () => {
      activeItem = '';
      const { rerender } = renderComponent();

      activeItem = '/home';
      rerender(
        <MemoryRouter>
          <NavigationMainItem
            item={item}
            activePath={activeItem}
          >
            {item.icon}
          </NavigationMainItem>
        </MemoryRouter>
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('aria-current');
    });

  });

});
