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

import { EditorGallery, filterEditors, sortEditors } from '@/components/EditorSelector/Gallery';
import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';
import { che } from '@/services/models';

jest.mock('@/components/EditorSelector/Gallery/Entry');

const mockOnSelect = jest.fn();

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

const defaultEditorId = 'che-incubator/che-code/insiders';
const selectedEditorId = 'che-incubator/che-code/latest';
const currentArchitecture = 'x86_64';

describe('EditorGallery', () => {
  let editors: che.Plugin[];

  beforeEach(() => {
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
        arch: [currentArchitecture],
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
        arch: [currentArchitecture],
      },
      {
        id: 'che-incubator/che-idea-server/latest',
        description: 'JetBrains IntelliJ IDEA Ultimate dev server for Eclipse Che - latest',
        // the displayName is missing - increase the test coverage
        // displayName: 'IntelliJ IDEA Ultimate (desktop)',
        links: {
          devfile: '/v3/plugins/che-incubator/che-idea-server/latest/devfile.yaml',
        },
        name: 'che-idea-server',
        publisher: 'che-incubator',
        type: 'Che Editor',
        version: 'latest',
        icon: '/v3/images/intllij-idea.svg',
        arch: [currentArchitecture],
      },
      {
        id: 'che-incubator/che-idea-server/next',
        description: 'JetBrains IntelliJ IDEA Ultimate dev server for Eclipse Che - next',
        // the displayName is missing - increase the test coverage
        // displayName: 'IntelliJ IDEA Ultimate (desktop)',
        links: {
          devfile: '/v3/plugins/che-incubator/che-idea-server/next/devfile.yaml',
        },
        name: 'che-idea-server',
        publisher: 'che-incubator',
        type: 'Che Editor',
        version: 'next',
        icon: '/v3/images/intllij-idea.svg',
        arch: [currentArchitecture],
      },
    ];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('snapshot', () => {
    const snapshot = createSnapshot(editors, defaultEditorId, selectedEditorId);
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  describe('filterEditors function', () => {
    describe('filtered by Deprecated tag', () => {
      beforeEach(() => {
        editors[0].tags = ['Deprecated'];
        editors[2].tags = ['Deprecated'];
      });

      test('default filtering', () => {
        const filteredIds = filterEditors(editors, currentArchitecture, undefined).map(
          editor => editor.id,
        );

        expect(filteredIds).toEqual([
          'che-incubator/che-code/latest',
          'che-incubator/che-idea-server/next',
        ]);
      });

      test('show deprecated editors', () => {
        const filteredIds = filterEditors(editors, currentArchitecture, {
          showDeprecated: true,
          hideById: [],
        }).map(editor => editor.id);

        expect(filteredIds).toEqual([
          'che-incubator/che-code/insiders',
          'che-incubator/che-code/latest',
          'che-incubator/che-idea-server/latest',
          'che-incubator/che-idea-server/next',
        ]);
      });

      test('hide deprecated editors', () => {
        const filteredIds = filterEditors(editors, currentArchitecture, {
          showDeprecated: false,
          hideById: [],
        }).map(editor => editor.id);

        expect(filteredIds).toEqual([
          'che-incubator/che-code/latest',
          'che-incubator/che-idea-server/next',
        ]);
      });
    });

    describe('filtered by unsupported architecture', () => {
      beforeEach(() => {
        editors[0].arch = [currentArchitecture, 's390x'];
        editors[1].arch = [currentArchitecture, 's390x'];
      });

      test('default filtering', () => {
        const filteredIds = filterEditors(editors, currentArchitecture, undefined).map(
          editor => editor.id,
        );

        expect(filteredIds).toEqual([
          'che-incubator/che-code/insiders',
          'che-incubator/che-code/latest',
          'che-incubator/che-idea-server/latest',
          'che-incubator/che-idea-server/next',
        ]);
      });

      test('filter by unsupported architecture', () => {
        const filteredIds = filterEditors(editors, 's390x', undefined).map(editor => editor.id);

        expect(filteredIds).toEqual([
          'che-incubator/che-code/insiders',
          'che-incubator/che-code/latest',
        ]);
      });
    });

    describe('filtered by editorId', () => {
      test('default filtering', () => {
        const filteredIds = filterEditors(editors, currentArchitecture, undefined).map(
          editor => editor.id,
        );

        expect(filteredIds).toEqual([
          'che-incubator/che-code/insiders',
          'che-incubator/che-code/latest',
          'che-incubator/che-idea-server/latest',
          'che-incubator/che-idea-server/next',
        ]);
      });

      test("hide 'che-incubator/che-code/insiders' editor", () => {
        const filteredIds = filterEditors(editors, currentArchitecture, {
          showDeprecated: false,
          hideById: ['che-incubator/che-code/insiders'],
        }).map(editor => editor.id);

        expect(filteredIds).toEqual([
          'che-incubator/che-code/latest',
          'che-incubator/che-idea-server/latest',
          'che-incubator/che-idea-server/next',
        ]);
      });

      test("hide 'che-incubator/che-code/insiders' and 'che-incubator/che-idea-server/next' editors", () => {
        const filteredIds = filterEditors(editors, currentArchitecture, {
          showDeprecated: false,
          hideById: ['che-incubator/che-code/insiders', 'che-incubator/che-idea-server/next'],
        }).map(editor => editor.id);

        expect(filteredIds).toEqual([
          'che-incubator/che-code/latest',
          'che-incubator/che-idea-server/latest',
        ]);
      });
    });
  });

  describe('sortEditors function', () => {
    test('insiders <=> latest', () => {
      const editorA = editors[0]; // insiders
      const editorB = editors[1]; // latest

      const sortedEditors = sortEditors([editorA, editorB]);

      expect(sortedEditors[0].version).toEqual('insiders');
      expect(sortedEditors[1].version).toEqual('latest');
    });

    test('latest <=> insiders', () => {
      const editorA = editors[1]; // latest
      const editorB = editors[0]; // insiders

      const sortedEditors = sortEditors([editorA, editorB]);

      expect(sortedEditors[0].version).toEqual('insiders');
      expect(sortedEditors[1].version).toEqual('latest');
    });

    test('1.0.0 <=> latest', () => {
      const editorA = editors[0];
      editorA.version = '1.0.0';
      editorA.id = `${editorA.publisher}/${editorA.name}/${editorA.version}`;
      const editorB = editors[1]; // latest

      const sortedEditors = sortEditors([editorA, editorB]);

      expect(sortedEditors[0].version).toEqual('latest');
      expect(sortedEditors[1].version).toEqual('1.0.0');
    });

    test('1.0.0(Deprecated) <=> latest', () => {
      const editorA = editors[0];
      editorA.tags = ['Deprecated'];
      editorA.version = '1.0.0';
      editorA.id = `${editorA.publisher}/${editorA.name}/${editorA.version}`;

      const editorB = editors[1]; // latest

      const sortedEditors = sortEditors([editorA, editorB]);

      expect(sortedEditors[0].version).toEqual('latest');
      expect(sortedEditors[1].version).toEqual('1.0.0'); // Deprecated
    });

    test('1.0.0 <=> latest(Deprecated)', () => {
      const editorA = editors[0];
      editorA.version = '1.0.0';
      editorA.id = `${editorA.publisher}/${editorA.name}/${editorA.version}`;

      const editorB = editors[1]; // latest
      editorB.tags = ['Deprecated'];

      const sortedEditors = sortEditors([editorA, editorB]);

      expect(sortedEditors[0].version).toEqual('1.0.0');
      expect(sortedEditors[1].version).toEqual('latest'); // Deprecated
    });

    test('insiders <=> 1.0.0', () => {
      const editorA = editors[0]; // insiders
      const editorB = editors[1];
      editorB.version = '1.0.0';
      editorA.id = `${editorA.publisher}/${editorA.name}/${editorA.version}`;

      const sortedEditors = sortEditors([editorA, editorB]);

      expect(sortedEditors[0].version).toEqual('insiders');
      expect(sortedEditors[1].version).toEqual('1.0.0');
    });

    test('insiders(Deprecated) <=> 1.0.0', () => {
      const editorA = editors[0]; // insiders
      editorA.id = `${editorA.publisher}/${editorA.name}/${editorA.version}`;
      editorA.tags = ['Deprecated'];

      const editorB = editors[1];
      editorB.version = '1.0.0';

      const sortedEditors = sortEditors([editorA, editorB]);

      expect(sortedEditors[0].version).toEqual('1.0.0');
      expect(sortedEditors[1].version).toEqual('insiders'); // Deprecated
    });

    test('insiders <=> 1.0.0(Deprecated)', () => {
      const editorA = editors[0]; // insiders
      editorA.id = `${editorA.publisher}/${editorA.name}/${editorA.version}`;

      const editorB = editors[1];
      editorB.version = '1.0.0';
      editorB.tags = ['Deprecated'];

      const sortedEditors = sortEditors([editorA, editorB]);

      expect(sortedEditors[0].version).toEqual('insiders');
      expect(sortedEditors[1].version).toEqual('1.0.0'); // Deprecated
    });
  });

  describe('select editor', () => {
    test('default and selected IDs are the same', () => {
      renderComponent(editors, defaultEditorId, defaultEditorId);

      expect(mockOnSelect).toHaveBeenCalledTimes(0);

      const nextEditor = editors[3];

      const button = screen.getByRole('button', {
        name: `Select ${nextEditor.name} ${nextEditor.version}`,
      });
      button.click();

      expect(mockOnSelect).toHaveBeenCalledTimes(1);
      expect(mockOnSelect).toHaveBeenNthCalledWith(1, nextEditor.id);
    });

    test('selected ID is different from the default ID', () => {
      renderComponent(editors, defaultEditorId, selectedEditorId);

      expect(mockOnSelect).toHaveBeenCalledTimes(0);

      const nextEditor = editors[3];

      const button = screen.getByRole('button', {
        name: `Select ${nextEditor.name} ${nextEditor.version}`,
      });
      button.click();

      expect(mockOnSelect).toHaveBeenCalledTimes(1);
      expect(mockOnSelect).toHaveBeenNthCalledWith(1, nextEditor.id);
    });

    test('selected ID is undefined', () => {
      renderComponent(editors, defaultEditorId, undefined);

      expect(mockOnSelect).toHaveBeenCalledTimes(1);
      expect(mockOnSelect).toHaveBeenNthCalledWith(1, defaultEditorId);

      const nextEditor = editors[3];

      const button = screen.getByRole('button', {
        name: `Select ${nextEditor.name} ${nextEditor.version}`,
      });
      button.click();

      expect(mockOnSelect).toHaveBeenCalledTimes(2);
      expect(mockOnSelect).toHaveBeenNthCalledWith(2, nextEditor.id);
    });

    test(`default ID doesn't match any editor and selected ID is undefined`, () => {
      renderComponent(editors, 'wrong/editor/id', undefined);

      expect(mockOnSelect).toHaveBeenCalledTimes(1);
      expect(mockOnSelect).toHaveBeenNthCalledWith(1, editors[0].id);

      const nextEditor = editors[3];

      const button = screen.getByRole('button', {
        name: `Select ${nextEditor.name} ${nextEditor.version}`,
      });
      button.click();

      expect(mockOnSelect).toHaveBeenCalledTimes(2);
      expect(mockOnSelect).toHaveBeenNthCalledWith(2, nextEditor.id);
    });

    test('should rerender when the selected editor changes', () => {
      const { reRenderComponent } = renderComponent(editors, defaultEditorId, undefined);

      const selectedEditor = screen.getAllByTestId('selected-editor-id')[0];
      expect(selectedEditor).toHaveTextContent(defaultEditorId);

      reRenderComponent(editors, defaultEditorId, selectedEditorId);

      const nextSelectedEditor = screen.getAllByTestId('selected-editor-id')[0];
      expect(nextSelectedEditor).toHaveTextContent(selectedEditorId);
    });
  });
});

function getComponent(
  editors: che.Plugin[],
  defaultId: string,
  selectedId: string | undefined = undefined,
) {
  return (
    <EditorGallery
      editorsVisibilityConfig={undefined}
      defaultEditorId={defaultId}
      currentArchitecture="x86_64"
      editors={editors}
      selectedEditorId={selectedId}
      onSelect={mockOnSelect}
    />
  );
}
