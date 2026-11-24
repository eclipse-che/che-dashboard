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

import userEvent, { UserEvent } from '@testing-library/user-event';
import React from 'react';

import {
  EditorDropdown,
  filterEditors,
  Props,
  sortEditors,
  sortEditorsNames,
} from '@/components/EditorSelector/Dropdown';
import getComponentRenderer, { screen, within } from '@/services/__mocks__/getComponentRenderer';
import { che } from '@/services/models';

const mockOnSelect = jest.fn();
const mockOnDefaultEditorClick = jest.fn();
const mockOnCustomEditorClick = jest.fn();

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

const currentArchitecture = 'x86_64';
const defaultEditorId = 'che-incubator/che-code/insiders';
const selectedEditorId = 'che-incubator/che-code/latest';

describe('EditorDropdown', () => {
  let editors: che.Plugin[];
  let user: UserEvent;

  beforeEach(() => {
    user = userEvent.setup();

    editors = [
      {
        id: 'che-incubator/che-code/insiders',
        description: 'VS Code - Open Source IDE for Eclipse Che - Insiders build',
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
        description: 'VS Code - Open Source IDE for Eclipse Che',
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
        description: 'IntelliJ IDEA Ultimate dev server for Eclipse Che - latest',
        // the displayName is missing on purpose - the name is shown instead
        links: {
          devfile: '/v3/plugins/che-incubator/che-idea-server/latest/devfile.yaml',
        },
        name: 'che-idea-server',
        publisher: 'che-incubator',
        type: 'Che Editor',
        version: 'latest',
        icon: '/v3/images/intellij-idea.svg',
        arch: [currentArchitecture],
      },
      {
        id: 'che-incubator/che-idea-server/next',
        description: 'IntelliJ IDEA Ultimate dev server for Eclipse Che - next',
        links: {
          devfile: '/v3/plugins/che-incubator/che-idea-server/next/devfile.yaml',
        },
        name: 'che-idea-server',
        publisher: 'che-incubator',
        type: 'Che Editor',
        version: 'next',
        icon: '/v3/images/intellij-idea.svg',
        arch: [currentArchitecture],
      },
    ];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('snapshot', () => {
    const snapshot = createSnapshot({ editors, defaultEditorId, selectedEditorId });

    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  describe('toggle', () => {
    test('default editor when nothing is selected', () => {
      renderComponent({ editors, defaultEditorId, selectedEditorId: undefined });

      const toggle = screen.getByTestId('editor-dropdown-toggle');
      expect(toggle).toHaveTextContent('Default Editor');

      // the default editor has no versions to choose from
      expect(screen.queryByTestId('version-select-toggle')).toBeNull();
    });

    test('the selected editor with its version select', () => {
      renderComponent({ editors, defaultEditorId, selectedEditorId });

      const toggle = screen.getByTestId('editor-dropdown-toggle');
      expect(toggle).toHaveTextContent('VS Code - Open Source');
      expect(within(toggle).getByRole('img')).toHaveAttribute('src', '/v3/images/vscode.svg');

      expect(screen.getByTestId('version-select-toggle')).not.toBeNull();
    });

    test('the editor name when the display name is missing', () => {
      renderComponent({
        editors,
        defaultEditorId,
        selectedEditorId: 'che-incubator/che-idea-server/next',
      });

      expect(screen.getByTestId('editor-dropdown-toggle')).toHaveTextContent('che-idea-server');
    });

    test('an SVG icon is inlined as a data URI', () => {
      editors[1].icon = '<svg><circle r="1"/></svg>';
      editors[1].iconMediatype = 'image/svg+xml';

      renderComponent({ editors, defaultEditorId, selectedEditorId });

      const toggle = screen.getByTestId('editor-dropdown-toggle');
      expect(within(toggle).getByRole('img')).toHaveAttribute(
        'src',
        'data:image/svg+xml;charset=utf-8,%3Csvg%3E%3Ccircle%20r%3D%221%22%2F%3E%3C%2Fsvg%3E',
      );
    });

    test('the allowed tags of the selected editor', () => {
      editors[1].tags = ['tech-preview', 'Community'];

      renderComponent({ editors, defaultEditorId, selectedEditorId });

      const toggle = screen.getByTestId('editor-dropdown-toggle');
      expect(toggle).toHaveTextContent('Tech Preview');
      // only 'Tech Preview' and 'Deprecated' are shown
      expect(toggle).not.toHaveTextContent('Community');
    });

    test(`the 'default' label on the cluster default editor`, () => {
      renderComponent({ editors, defaultEditorId, selectedEditorId: defaultEditorId });

      expect(screen.getByTestId('editor-dropdown-toggle')).toHaveTextContent('default');
    });

    test(`no 'default' label on a non-default version of the default editor`, () => {
      renderComponent({ editors, defaultEditorId, selectedEditorId });

      expect(screen.getByTestId('editor-dropdown-toggle')).not.toHaveTextContent('default');
    });

    test(`no 'default' label when the editor is not the cluster default`, () => {
      renderComponent({
        editors,
        defaultEditorId,
        selectedEditorId: 'che-incubator/che-idea-server/next',
      });

      expect(screen.getByTestId('editor-dropdown-toggle')).not.toHaveTextContent('default');
    });

    test('the custom editor name', () => {
      renderComponent({
        editors,
        defaultEditorId,
        selectedEditorId,
        customEditorName: 'my-custom-editor',
      });

      expect(screen.getByTestId('editor-dropdown-toggle')).toHaveTextContent('my-custom-editor');
      // a custom editor has no versions to choose from
      expect(screen.queryByTestId('version-select-toggle')).toBeNull();
    });
  });

  describe('editor dropdown', () => {
    test('the entries and their order', async () => {
      renderComponent({ editors, defaultEditorId, selectedEditorId });

      await user.click(screen.getByTestId('editor-dropdown-toggle'));

      expect(screen.getByTestId('default-editor-dropdown-item')).toHaveTextContent(
        'Default Editor',
      );
      expect(screen.getByTestId('custom-editor-dropdown-item')).toHaveTextContent('Custom Editor');

      const editorItems = screen.getAllByTestId('editor-dropdown-item');
      expect(editorItems.length).toEqual(2);
      // 'che-code' comes first, the rest is sorted by name
      expect(editorItems[0]).toHaveTextContent('VS Code - Open Source');
      expect(editorItems[1]).toHaveTextContent('che-idea-server');
    });

    test('the custom editor entry is hidden when it cannot be used', async () => {
      renderComponent({
        editors,
        defaultEditorId,
        selectedEditorId,
        canUseCustomEditor: false,
      });

      await user.click(screen.getByTestId('editor-dropdown-toggle'));

      expect(screen.queryByTestId('custom-editor-dropdown-item')).toBeNull();
      expect(screen.getByTestId('default-editor-dropdown-item')).not.toBeNull();
    });

    test('the default editor entry is checked when nothing is selected', async () => {
      renderComponent({ editors, defaultEditorId, selectedEditorId: undefined });

      await user.click(screen.getByTestId('editor-dropdown-toggle'));

      expect(menuItem(screen.getByTestId('default-editor-dropdown-item'))).toHaveClass(
        'pf-m-selected',
      );
    });

    test('nothing is checked when a custom editor is selected', async () => {
      renderComponent({
        editors,
        defaultEditorId,
        selectedEditorId,
        customEditorName: 'my-custom-editor',
      });

      await user.click(screen.getByTestId('editor-dropdown-toggle'));

      expect(menuItem(screen.getByTestId('default-editor-dropdown-item'))).not.toHaveClass(
        'pf-m-selected',
      );
      screen
        .getAllByTestId('editor-dropdown-item')
        .forEach(item => expect(menuItem(item)).not.toHaveClass('pf-m-selected'));
    });

    test('the selected editor entry is checked', async () => {
      renderComponent({ editors, defaultEditorId, selectedEditorId });

      await user.click(screen.getByTestId('editor-dropdown-toggle'));

      const editorItems = screen.getAllByTestId('editor-dropdown-item');
      expect(menuItem(editorItems[0])).toHaveClass('pf-m-selected');
      expect(menuItem(editorItems[1])).not.toHaveClass('pf-m-selected');
    });

    test(`the 'default' label marks the cluster default editor only`, async () => {
      renderComponent({ editors, defaultEditorId, selectedEditorId });

      await user.click(screen.getByTestId('editor-dropdown-toggle'));

      const editorItems = screen.getAllByTestId('editor-dropdown-item');
      expect(editorItems[0]).toHaveTextContent('default');
      expect(editorItems[1]).not.toHaveTextContent('default');
    });

    test('the allowed tags of an entry', async () => {
      editors[0].tags = ['Tech-Preview'];
      editors[2].tags = ['Community'];

      renderComponent({ editors, defaultEditorId, selectedEditorId });

      await user.click(screen.getByTestId('editor-dropdown-toggle'));

      const editorItems = screen.getAllByTestId('editor-dropdown-item');
      expect(editorItems[0]).toHaveTextContent('Tech Preview');
      expect(editorItems[1]).not.toHaveTextContent('Community');
    });

    test('an SVG entry icon is inlined as a data URI', async () => {
      editors[0].icon = '<svg><circle r="1"/></svg>';
      editors[0].iconMediatype = 'image/svg+xml';

      renderComponent({ editors, defaultEditorId, selectedEditorId });

      await user.click(screen.getByTestId('editor-dropdown-toggle'));

      const icon = within(screen.getAllByTestId('editor-dropdown-item')[0]).getByRole('img');
      expect(icon).toHaveAttribute(
        'src',
        'data:image/svg+xml;charset=utf-8,%3Csvg%3E%3Ccircle%20r%3D%221%22%2F%3E%3C%2Fsvg%3E',
      );
    });

    test('the provider link of an entry', async () => {
      editors[0].provider = 'Provided by [Red Hat](https://redhat.com)';

      renderComponent({ editors, defaultEditorId, selectedEditorId });

      await user.click(screen.getByTestId('editor-dropdown-toggle'));

      const link = within(screen.getAllByTestId('editor-dropdown-item')[0]).getByRole('link', {
        name: 'Red Hat',
      });
      expect(link).toHaveAttribute('href', 'https://redhat.com');
      expect(link).toHaveAttribute('target', '_blank');
    });

    test('a provider link with a disallowed scheme is dropped', async () => {
      editors[0].provider = 'Provided by [Red Hat](javascript:alert(1))';

      renderComponent({ editors, defaultEditorId, selectedEditorId });

      await user.click(screen.getByTestId('editor-dropdown-toggle'));

      const entry = screen.getAllByTestId('editor-dropdown-item')[0];
      expect(entry).toHaveTextContent('Provided by Red Hat');
      expect(within(entry).queryByRole('link')).toBeNull();
    });
  });

  describe('selecting an editor', () => {
    test('the default editor', async () => {
      renderComponent({ editors, defaultEditorId, selectedEditorId });

      await user.click(screen.getByTestId('editor-dropdown-toggle'));
      await user.click(menuItem(screen.getByTestId('default-editor-dropdown-item')));

      expect(mockOnDefaultEditorClick).toHaveBeenCalledTimes(1);
      expect(mockOnSelect).not.toHaveBeenCalled();
      // the dropdown closes on select
      expect(screen.getByTestId('editor-dropdown-toggle')).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    });

    test('a custom editor', async () => {
      renderComponent({ editors, defaultEditorId, selectedEditorId });

      await user.click(screen.getByTestId('editor-dropdown-toggle'));
      await user.click(menuItem(screen.getByTestId('custom-editor-dropdown-item')));

      expect(mockOnCustomEditorClick).toHaveBeenCalledTimes(1);
      expect(mockOnSelect).not.toHaveBeenCalled();
      expect(screen.getByTestId('editor-dropdown-toggle')).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    });

    test('an editor reports the first version of its group', async () => {
      renderComponent({ editors, defaultEditorId, selectedEditorId });

      await user.click(screen.getByTestId('editor-dropdown-toggle'));
      await user.click(menuItem(screen.getAllByTestId('editor-dropdown-item')[1]));

      expect(mockOnSelect).toHaveBeenCalledTimes(1);
      expect(mockOnSelect).toHaveBeenCalledWith('che-incubator/che-idea-server/next');
    });

    test('the toggle follows the selected editor', async () => {
      renderComponent({ editors, defaultEditorId, selectedEditorId: undefined });

      expect(screen.getByTestId('editor-dropdown-toggle')).toHaveTextContent('Default Editor');

      await user.click(screen.getByTestId('editor-dropdown-toggle'));
      await user.click(menuItem(screen.getAllByTestId('editor-dropdown-item')[1]));

      expect(screen.getByTestId('editor-dropdown-toggle')).toHaveTextContent('che-idea-server');
    });
  });

  describe('version select', () => {
    test('lists the versions of the selected editor', async () => {
      renderComponent({ editors, defaultEditorId, selectedEditorId });

      await user.click(screen.getByTestId('version-select-toggle'));

      const options = screen.getAllByRole('option');
      expect(options.length).toEqual(2);
      expect(options[0]).toHaveTextContent('insiders');
      expect(options[1]).toHaveTextContent('latest');
    });

    test(`the 'default' label marks the default version of the default editor`, async () => {
      renderComponent({ editors, defaultEditorId, selectedEditorId });

      await user.click(screen.getByTestId('version-select-toggle'));

      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveTextContent('default');
      expect(options[1]).not.toHaveTextContent('default');
    });

    test(`no 'default' label when the editor is not the cluster default`, async () => {
      renderComponent({
        editors,
        defaultEditorId,
        selectedEditorId: 'che-incubator/che-idea-server/next',
      });

      await user.click(screen.getByTestId('version-select-toggle'));

      screen
        .getAllByRole('option')
        .forEach(option => expect(option).not.toHaveTextContent('default'));
    });

    test('selecting a version reports it', async () => {
      renderComponent({ editors, defaultEditorId, selectedEditorId });

      await user.click(screen.getByTestId('version-select-toggle'));
      await user.click(screen.getAllByRole('option')[0]);

      expect(mockOnSelect).toHaveBeenCalledTimes(1);
      expect(mockOnSelect).toHaveBeenCalledWith('che-incubator/che-code/insiders');
      // the select closes on select
      expect(screen.getByTestId('version-select-toggle')).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('re-initialization', () => {
    test('the editors arrive after the first render', () => {
      const { reRenderComponent } = renderComponent({
        editors: [],
        defaultEditorId,
        selectedEditorId,
      });

      expect(screen.getByTestId('editor-dropdown-toggle')).toHaveTextContent('Default Editor');

      reRenderComponent({ editors, defaultEditorId, selectedEditorId });

      expect(screen.getByTestId('editor-dropdown-toggle')).toHaveTextContent(
        'VS Code - Open Source',
      );
    });

    test('the selected editor changes', () => {
      const { reRenderComponent } = renderComponent({
        editors,
        defaultEditorId,
        selectedEditorId,
      });

      reRenderComponent({
        editors,
        defaultEditorId,
        selectedEditorId: 'che-incubator/che-idea-server/next',
      });

      expect(screen.getByTestId('editor-dropdown-toggle')).toHaveTextContent('che-idea-server');
    });

    test('the architecture changes', () => {
      editors[2].arch = ['s390x'];
      editors[3].arch = ['s390x'];

      const { reRenderComponent } = renderComponent({
        editors,
        defaultEditorId,
        selectedEditorId,
      });

      reRenderComponent({
        editors,
        defaultEditorId,
        selectedEditorId,
        currentArchitecture: 's390x',
      });

      expect(screen.getByTestId('editor-dropdown-toggle')).toHaveTextContent('Default Editor');
    });

    test('the visibility config changes', () => {
      const { reRenderComponent } = renderComponent({
        editors,
        defaultEditorId,
        selectedEditorId,
      });

      reRenderComponent({
        editors,
        defaultEditorId,
        selectedEditorId,
        editorsVisibilityConfig: { showDeprecated: false, hideById: [selectedEditorId] },
      });

      expect(screen.getByTestId('editor-dropdown-toggle')).toHaveTextContent('Default Editor');
    });

    test('an unknown selected editor falls back to the default editor', () => {
      renderComponent({ editors, defaultEditorId, selectedEditorId: 'wrong/editor/id' });

      expect(screen.getByTestId('editor-dropdown-toggle')).toHaveTextContent('Default Editor');
    });
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

    describe('filtered by architecture', () => {
      test('an editor without an architecture is dropped', () => {
        editors[0].arch = undefined;

        const filteredIds = filterEditors(editors, currentArchitecture, undefined).map(
          editor => editor.id,
        );

        expect(filteredIds).toEqual([
          'che-incubator/che-code/latest',
          'che-incubator/che-idea-server/latest',
          'che-incubator/che-idea-server/next',
        ]);
      });

      test('filter by unsupported architecture', () => {
        editors[0].arch = [currentArchitecture, 's390x'];
        editors[1].arch = [currentArchitecture, 's390x'];

        const filteredIds = filterEditors(editors, 's390x', undefined).map(editor => editor.id);

        expect(filteredIds).toEqual([
          'che-incubator/che-code/insiders',
          'che-incubator/che-code/latest',
        ]);
      });
    });

    describe('filtered by editor id', () => {
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

  describe('sortEditorsNames function', () => {
    test('with che-code and che-code-server editors', () => {
      const editorsNames = sortEditorsNames([
        'che-phpstorm-server',
        'che-clion-server',
        'che-code-server',
        'che-code',
      ]);

      expect(editorsNames).toEqual([
        'che-code',
        'che-code-server',
        'che-clion-server',
        'che-phpstorm-server',
      ]);
    });

    test('che-code is last in the input', () => {
      const editorsNames = sortEditorsNames(['che-code-server', 'che-code-insiders', 'che-code']);

      expect(editorsNames).toEqual(['che-code', 'che-code-insiders', 'che-code-server']);
    });

    test('without che-code editors', () => {
      const editorsNames = sortEditorsNames(['che-phpstorm-server', 'che-clion-server']);

      expect(editorsNames).toEqual(['che-clion-server', 'che-phpstorm-server']);
    });
  });

  describe('sortEditors function', () => {
    test('an empty list', () => {
      expect(sortEditors([])).toEqual([]);
    });

    test('insiders <=> latest', () => {
      const sortedEditors = sortEditors([editors[0], editors[1]]);

      expect(sortedEditors[0].version).toEqual('insiders');
      expect(sortedEditors[1].version).toEqual('latest');
    });

    test('latest <=> insiders', () => {
      const sortedEditors = sortEditors([editors[1], editors[0]]);

      expect(sortedEditors[0].version).toEqual('insiders');
      expect(sortedEditors[1].version).toEqual('latest');
    });

    test('1.0.0 <=> latest', () => {
      const editorA = editors[0];
      editorA.version = '1.0.0';
      editorA.id = `${editorA.publisher}/${editorA.name}/${editorA.version}`;

      const sortedEditors = sortEditors([editorA, editors[1]]);

      expect(sortedEditors[0].version).toEqual('latest');
      expect(sortedEditors[1].version).toEqual('1.0.0');
    });

    test('insiders <=> 1.0.0', () => {
      const editorB = editors[1];
      editorB.version = '1.0.0';
      editorB.id = `${editorB.publisher}/${editorB.name}/${editorB.version}`;

      const sortedEditors = sortEditors([editors[0], editorB]);

      expect(sortedEditors[0].version).toEqual('insiders');
      expect(sortedEditors[1].version).toEqual('1.0.0');
    });

    test('1.0.0(Deprecated) <=> latest', () => {
      const editorA = editors[0];
      editorA.tags = ['Deprecated'];
      editorA.version = '1.0.0';
      editorA.id = `${editorA.publisher}/${editorA.name}/${editorA.version}`;

      const sortedEditors = sortEditors([editorA, editors[1]]);

      expect(sortedEditors[0].version).toEqual('latest');
      expect(sortedEditors[1].version).toEqual('1.0.0'); // Deprecated
    });

    test('1.0.0 <=> latest(Deprecated)', () => {
      const editorA = editors[0];
      editorA.version = '1.0.0';
      editorA.id = `${editorA.publisher}/${editorA.name}/${editorA.version}`;

      const editorB = editors[1];
      editorB.tags = ['Deprecated'];

      const sortedEditors = sortEditors([editorA, editorB]);

      expect(sortedEditors[0].version).toEqual('1.0.0');
      expect(sortedEditors[1].version).toEqual('latest'); // Deprecated
    });

    test('insiders(Deprecated) <=> 1.0.0', () => {
      const editorA = editors[0];
      editorA.tags = ['Deprecated'];

      const editorB = editors[1];
      editorB.version = '1.0.0';
      editorB.id = `${editorB.publisher}/${editorB.name}/${editorB.version}`;

      const sortedEditors = sortEditors([editorA, editorB]);

      expect(sortedEditors[0].version).toEqual('1.0.0');
      expect(sortedEditors[1].version).toEqual('insiders'); // Deprecated
    });

    test('editors with different names are sorted by id', () => {
      const sortedEditors = sortEditors([editors[3], editors[1]]);

      expect(sortedEditors.map(editor => editor.id)).toEqual([
        'che-incubator/che-code/latest',
        'che-incubator/che-idea-server/next',
      ]);
    });
  });
});

function menuItem(element: HTMLElement): HTMLElement {
  return within(element).getByRole('menuitem');
}

function getComponent(props: Partial<Props>) {
  return (
    <EditorDropdown
      defaultEditorId={props.defaultEditorId || defaultEditorId}
      editors={props.editors || []}
      currentArchitecture={props.currentArchitecture || currentArchitecture}
      selectedEditorId={props.selectedEditorId}
      editorsVisibilityConfig={props.editorsVisibilityConfig}
      customEditorName={props.customEditorName}
      canUseCustomEditor={props.canUseCustomEditor}
      onSelect={mockOnSelect}
      onDefaultEditorClick={mockOnDefaultEditorClick}
      onCustomEditorClick={mockOnCustomEditorClick}
    />
  );
}
