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

import { EditorGallery } from '@/components/EditorSelector/Gallery';
import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';
import { che } from '@/services/models';

jest.mock('@/components/EditorSelector/Gallery/Entry');

const mockOnSelect = jest.fn();

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

describe('EditorGallery', () => {
  let editorId: string;
  let editors: che.Plugin[];

  beforeEach(() => {
    editorId = 'che-incubator/che-code/latest';
    editors = [
      {
        id: 'che-incubator/che-code/insiders',
        description:
          'Microsoft Visual Studio Code - Open Source IDE for Eclipse Che - Insiders build',
        displayName: 'VS Code - Open Source',
        links: {
          devfile: '/v3/plugins/che-incubator/che-code/insiders/devfile.yaml',
        },
        name: 'che-code',
        publisher: 'che-incubator',
        type: 'Che Editor',
        version: 'insiders',
        icon: '/v3/images/vscode.svg',
      },
      {
        id: 'che-incubator/che-code/latest',
        description: 'Microsoft Visual Studio Code - Open Source IDE for Eclipse Che',
        displayName: 'VS Code - Open Source',
        links: {
          devfile: '/v3/plugins/che-incubator/che-code/latest/devfile.yaml',
        },
        name: 'che-code',
        publisher: 'che-incubator',
        type: 'Che Editor',
        version: 'latest',
        icon: '/v3/images/vscode.svg',
      },
      {
        id: 'che-incubator/che-idea-server/latest',
        description: 'JetBrains IntelliJ IDEA Ultimate dev server for Eclipse Che - latest',
        displayName: 'IntelliJ IDEA Ultimate (desktop)',
        links: {
          devfile: '/v3/plugins/che-incubator/che-idea-server/latest/devfile.yaml',
        },
        name: 'che-idea-server',
        publisher: 'che-incubator',
        type: 'Che Editor',
        version: 'latest',
        icon: '/v3/images/intllij-idea.svg',
      },
      {
        id: 'che-incubator/che-idea-server/next',
        description: 'JetBrains IntelliJ IDEA Ultimate dev server for Eclipse Che - next',
        displayName: 'IntelliJ IDEA Ultimate (desktop)',
        links: {
          devfile: '/v3/plugins/che-incubator/che-idea-server/next/devfile.yaml',
        },
        name: 'che-idea-server',
        publisher: 'che-incubator',
        type: 'Che Editor',
        version: 'next',
        icon: '/v3/images/intllij-idea.svg',
      },
    ];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('snapshot', () => {
    const snapshot = createSnapshot(editorId, editors);
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  test('editor select', () => {
    renderComponent(editorId, editors);

    const button = screen.getByRole('button', { name: 'Select che-code insiders' });
    button.click();

    expect(mockOnSelect).toHaveBeenCalledWith('che-incubator/che-code/insiders');
  });
});

function getComponent(editorId: string, editors: che.Plugin[]) {
  return <EditorGallery editors={editors} selectedEditorId={editorId} onSelect={mockOnSelect} />;
}
