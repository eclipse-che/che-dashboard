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

import * as React from 'react';

import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';

import { GitConfigSectionUser, Props } from '..';

jest.mock('@/pages/UserPreferences/GitConfig/Form/SectionUser/Email');
jest.mock('@/pages/UserPreferences/GitConfig/Form/SectionUser/Name');

const mockOnChange = jest.fn();

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

describe('GitConfigSectionUser', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('snapshot', () => {
    const snapshot = createSnapshot({
      config: {
        user: {
          name: 'user',
          email: 'user@che',
        },
      },
      isLoading: false,
      onChange: mockOnChange,
    });
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  it('should handle name change', () => {
    renderComponent({
      config: {
        user: {
          name: 'user',
          email: 'user@che',
        },
      },
      isLoading: false,
      onChange: mockOnChange,
    });

    screen.getByText('Change Name Valid').click();

    expect(mockOnChange).toHaveBeenCalledWith(
      {
        user: {
          name: 'new user',
          email: 'user@che',
        },
      },
      false,
    );
  });

  it('should handle email change', () => {
    renderComponent({
      config: {
        user: {
          name: 'user',
          email: 'user@che',
        },
      },
      isLoading: false,
      onChange: mockOnChange,
    });

    screen.getByText('Change Email Valid').click();

    expect(mockOnChange).toHaveBeenCalledWith(
      {
        user: {
          name: 'user',
          email: 'new-user@che',
        },
      },
      false,
    );
  });

  it('should report invalid when email is invalid and name changes', () => {
    renderComponent({
      config: {
        user: {
          name: 'user',
          email: 'user@che',
        },
      },
      isLoading: false,
      onChange: mockOnChange,
    });

    // First, make email invalid
    screen.getByText('Change Email Invalid').click();

    expect(mockOnChange).toHaveBeenLastCalledWith(
      {
        user: {
          name: 'user',
          email: 'new-user@che',
        },
      },
      false,
    );

    // Then change name - should still be invalid because email is invalid
    screen.getByText('Change Name Valid').click();

    expect(mockOnChange).toHaveBeenLastCalledWith(
      {
        user: {
          name: 'new user',
          email: 'user@che', // email returns to original props value
        },
      },
      false, // but form is still invalid because email field's validity is tracked
    );
  });

  it('should report invalid when name is invalid and email changes', () => {
    renderComponent({
      config: {
        user: {
          name: 'user',
          email: 'user@che',
        },
      },
      isLoading: false,
      onChange: mockOnChange,
    });

    // First, make name invalid
    screen.getByText('Change Name Invalid').click();

    expect(mockOnChange).toHaveBeenLastCalledWith(
      {
        user: {
          name: 'new user',
          email: 'user@che',
        },
      },
      false,
    );

    // Then change email - should still be invalid because name is invalid
    screen.getByText('Change Email Valid').click();

    expect(mockOnChange).toHaveBeenLastCalledWith(
      {
        user: {
          name: 'user', // name returns to original props value
          email: 'new-user@che',
        },
      },
      false, // but form is still invalid because name field's validity is tracked
    );
  });
});

function getComponent(props: Props): React.ReactElement {
  return <GitConfigSectionUser {...props} />;
}
