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

import { Dropdown, KebabToggle } from '@patternfly/react-core';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { PluginEditor } from '@/pages/GetStarted/SamplesList/Gallery';
import { DropdownEditors } from '@/pages/GetStarted/SamplesList/Gallery/Card/DropdownEditors';
import getComponentRenderer, { screen, within } from '@/services/__mocks__/getComponentRenderer';

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

const onItemClick = jest.fn();

describe('DropdownEditors component', () => {
  let editors: PluginEditor[];

  beforeEach(() => {
    editors = [
      {
        id: 'che-incubator/che-code/insiders',
        name: 'che-code',
        description:
          'Microsoft Visual Studio Code - Open Source IDE for Eclipse Che - Insiders build',
        version: 'insiders',
        isDefault: true,
      },
      {
        id: 'che-incubator/che-idea/next',
        name: 'che-idea',
        description: 'JetBrains IntelliJ IDEA Community IDE for Eclipse Che - next',
        version: 'next',
        isDefault: false,
      },
    ] as PluginEditor[];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('snapshot', () => {
    const snapshot = createSnapshot(editors);
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  it('should have editor items', async () => {
    renderComponent(editors);

    const dropdown = screen.getByTestId('card-actions-dropdown');

    const menuButton = within(dropdown).queryByRole('button');
    expect(menuButton).not.toBeNull();

    userEvent.click(menuButton as HTMLElement);

    const menuitems = await screen.findAllByRole('menuitem');

    expect(menuitems.length).toEqual(2);

    const codeItem = menuitems[0];
    expect(codeItem.textContent).toContain('che-code');

    const codeItemCheckMark = within(codeItem).queryByTestId('checkmark');
    expect(codeItemCheckMark).not.toBeNull();

    const ideaItem = menuitems[1];
    expect(ideaItem.textContent).toContain('che-idea');

    const ideaItemCheckMark = within(ideaItem).queryByTestId('checkmark');
    expect(ideaItemCheckMark).toBeNull();
  });

  it('should handle "onClick" events', async () => {
    renderComponent(editors);

    const dropdown = screen.getByTestId('card-actions-dropdown');

    const menuButton = within(dropdown).queryByRole('button');
    expect(menuButton).not.toBeNull();

    userEvent.click(menuButton as HTMLElement);

    const menuitems = await screen.findAllByRole('menuitem');

    const codeItem = menuitems[0];
    userEvent.click(codeItem);

    expect(onItemClick).toHaveBeenCalledWith('che-incubator/che-code/insiders');
  });
});

function getComponent(editors: PluginEditor[]): React.ReactElement {
  return (
    <Dropdown
      isOpen={true}
      toggle={<KebabToggle />}
      dropdownItems={[
        <DropdownEditors key="test" onEditorSelect={onItemClick} editors={editors} />,
      ]}
    />
  );
}
