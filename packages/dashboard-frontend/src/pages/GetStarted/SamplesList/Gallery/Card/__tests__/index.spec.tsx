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

import userEvent from '@testing-library/user-event';
import React from 'react';

import { PluginEditor } from '@/pages/GetStarted/SamplesList/Gallery';
import { SampleCard } from '@/pages/GetStarted/SamplesList/Gallery/Card';
import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';
import { DevfileRegistryMetadata } from '@/store/DevfileRegistries/selectors';

jest.mock('@/pages/GetStarted/SamplesList/Gallery/Card/DropdownEditors');

const onCardClick = jest.fn();

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

describe('Devfile Metadata Card', () => {
  let metadata: DevfileRegistryMetadata;
  let editors: PluginEditor[];

  beforeEach(() => {
    metadata = {
      displayName: 'Go',
      description: 'Stack with Go 1.12.10',
      tags: ['Debian', 'Go'],
      icon: '/images/go.svg',
      globalMemoryLimit: '1686Mi',
      links: {
        v2: '/devfiles/go/devfile.yaml',
      },
    };
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
    const snapshot = createSnapshot(metadata, editors);
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  it('should have a correct title in header', () => {
    renderComponent(metadata, editors);
    const cardHeader = screen.getByText(metadata.displayName);
    expect(cardHeader).toBeTruthy();
  });

  it('should have an icon', () => {
    renderComponent(metadata, editors);
    const cardIcon = screen.queryByTestId('sample-card-icon');
    expect(cardIcon).toBeTruthy();
  });

  it('should be able to provide the default icon', () => {
    metadata.icon = '';
    renderComponent(metadata, editors);

    const sampleIcon = screen.queryByTestId('sample-card-icon');
    expect(sampleIcon).toBeFalsy();

    const blankIcon = screen.getByTestId('default-card-icon');
    expect(blankIcon).toBeTruthy();
  });

  it('should not have visible tags', () => {
    metadata.tags = ['Debian', 'Go'];
    renderComponent(metadata, editors);

    const badge = screen.queryAllByTestId('card-badge');
    expect(badge.length).toEqual(0);
  });

  it('should have "Community" tag', () => {
    metadata.tags = ['Community', 'Debian', 'Go'];
    renderComponent(metadata, editors);

    const badge = screen.queryAllByTestId('card-badge');
    expect(badge.length).toEqual(1);
    expect(screen.queryByText('Community')).toBeTruthy();
  });

  it('should have "tech-preview" tag', () => {
    metadata.tags = ['Tech-Preview', 'Debian', 'Go'];
    renderComponent(metadata, editors);

    const badge = screen.queryAllByTestId('card-badge');
    expect(badge.length).toEqual(1);
    expect(screen.queryByText('Tech-Preview')).toBeTruthy();
  });

  it('should handle card click', () => {
    renderComponent(metadata, editors);

    const card = screen.getByRole('article');
    userEvent.click(card);

    expect(onCardClick).toHaveBeenCalledWith(undefined);
  });

  it('should handle action click', () => {
    renderComponent(metadata, editors);

    const actionButton = screen.getByRole('button', { name: 'Select Editor' });

    userEvent.click(actionButton);

    expect(onCardClick).toHaveBeenCalledWith(editors[0].id);
  });
});

function getComponent(
  metadata: DevfileRegistryMetadata,
  editors: PluginEditor[],
): React.ReactElement {
  return (
    <SampleCard
      editors={editors}
      key={metadata.links.self}
      metadata={metadata}
      onClick={onCardClick}
    />
  );
}
