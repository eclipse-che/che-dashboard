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

import userEvent from '@testing-library/user-event';
import React from 'react';

import { CustomEditorModal } from '@/components/EditorSelector/CustomEditorModal';
import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';

const { renderComponent } = getComponentRenderer(getComponent);

const mockOnClose = jest.fn();
const mockOnSave = jest.fn();

const editorDevfile = `schemaVersion: 2.2.2
metadata:
  name: che-code
  displayName: VS Code - Open Source
components:
  - name: che-code-injector
    container:
      image: quay.io/che-incubator/che-code:insiders
`;

const editorReference = `reference: https://eclipse-che.github.io/che-plugin-registry/main/v3/plugins/che-incubator/che-code/insiders/devfile.yaml
override:
  containers:
    - name: che-code-injector
      memoryLimit: 2048Mi
`;

function getComponent(isOpen = true) {
  return <CustomEditorModal isOpen={isOpen} onClose={mockOnClose} onSave={mockOnSave} />;
}

describe('CustomEditorModal', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('modal is rendered', () => {
    renderComponent();

    expect(screen.getByTestId('custom-editor-modal')).toBeInTheDocument();
  });

  test('the definition hint is shown', () => {
    renderComponent();

    expect(screen.getByTestId('custom-editor-definition-hint')).toHaveTextContent(
      'Default editor will be used if no definition is provided.',
    );
  });

  describe('editor name', () => {
    test('save is disabled while the name is empty', async () => {
      renderComponent();

      await userEvent.type(screen.getByTestId('custom-editor-image-input'), 'quay.io/my/editor');

      expect(screen.getByTestId('custom-editor-save-button')).toBeDisabled();
    });

    test.each([
      ['Upper Case', 'Che Code'],
      ['leading dash', '-che-code'],
      ['trailing dot', 'che-code.'],
      ['underscore', 'che_code'],
      ['space', 'che code'],
    ])('a name with %s is rejected', async (_label, name) => {
      renderComponent();

      await userEvent.type(screen.getByTestId('custom-editor-name-input'), name);

      expect(screen.getByTestId('custom-editor-name-error')).toBeInTheDocument();
      expect(screen.getByTestId('custom-editor-save-button')).toBeDisabled();
    });

    test.each([['che-code'], ['che-code.insiders'], ['editor1']])(
      '%s is accepted as a name',
      async name => {
        renderComponent();

        await userEvent.type(screen.getByTestId('custom-editor-name-input'), name);
        await userEvent.type(screen.getByTestId('custom-editor-image-input'), 'quay.io/my/editor');

        expect(screen.queryByTestId('custom-editor-name-error')).toBeNull();
        expect(screen.getByTestId('custom-editor-save-button')).not.toBeDisabled();
      },
    );
  });

  describe('editor definition', () => {
    test('the name is taken from metadata.name of the definition', async () => {
      renderComponent();

      await userEvent.click(screen.getByTestId('custom-editor-definition-textarea'));
      await userEvent.paste(editorDevfile);

      expect(screen.getByTestId('custom-editor-name-input')).toHaveValue('che-code');
    });

    test('a reference definition leaves the typed name alone', async () => {
      renderComponent();

      await userEvent.type(screen.getByTestId('custom-editor-name-input'), 'my-editor');
      await userEvent.click(screen.getByTestId('custom-editor-definition-textarea'));
      await userEvent.paste(editorReference);

      expect(screen.getByTestId('custom-editor-name-input')).toHaveValue('my-editor');
      expect(screen.queryByTestId('custom-editor-definition-error')).toBeNull();
    });

    test('a definition that is not a YAML document is rejected', async () => {
      renderComponent();

      await userEvent.type(screen.getByTestId('custom-editor-name-input'), 'my-editor');
      await userEvent.click(screen.getByTestId('custom-editor-definition-textarea'));
      await userEvent.paste('just a string');

      expect(screen.getByTestId('custom-editor-definition-error')).toBeInTheDocument();
      expect(screen.getByTestId('custom-editor-save-button')).toBeDisabled();
    });

    test('the image is not required once a definition is given', async () => {
      renderComponent();

      await userEvent.click(screen.getByTestId('custom-editor-definition-textarea'));
      await userEvent.paste(editorDevfile);

      expect(screen.getByTestId('custom-editor-save-button')).not.toBeDisabled();
    });

    test('the image is required while there is no definition', async () => {
      renderComponent();

      await userEvent.type(screen.getByTestId('custom-editor-name-input'), 'my-editor');

      expect(screen.getByTestId('custom-editor-save-button')).toBeDisabled();

      await userEvent.type(screen.getByTestId('custom-editor-image-input'), 'quay.io/my/editor');

      expect(screen.getByTestId('custom-editor-save-button')).not.toBeDisabled();
    });
  });

  describe('saving', () => {
    test('onSave receives the trimmed values', async () => {
      renderComponent();

      await userEvent.click(screen.getByTestId('custom-editor-definition-textarea'));
      await userEvent.paste(editorDevfile);
      await userEvent.type(screen.getByTestId('custom-editor-image-input'), '  quay.io/my/editor ');

      await userEvent.click(screen.getByTestId('custom-editor-save-button'));

      expect(mockOnSave).toHaveBeenCalledWith(
        'che-code',
        editorDevfile.trim(),
        'quay.io/my/editor',
      );
    });

    test('an empty definition is saved as undefined', async () => {
      renderComponent();

      await userEvent.type(screen.getByTestId('custom-editor-name-input'), 'my-editor');
      await userEvent.type(screen.getByTestId('custom-editor-image-input'), 'quay.io/my/editor');

      await userEvent.click(screen.getByTestId('custom-editor-save-button'));

      expect(mockOnSave).toHaveBeenCalledWith('my-editor', undefined, 'quay.io/my/editor');
    });

    test('clicking cancel calls onClose', async () => {
      renderComponent();

      await userEvent.click(screen.getByTestId('custom-editor-cancel-button'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    test('no delete button is offered', () => {
      renderComponent();

      expect(screen.queryByTestId('custom-editor-delete-button')).toBeNull();
    });
  });

  test('the form is cleared when the modal is reopened', async () => {
    const { reRenderComponent } = renderComponent(true);

    await userEvent.type(screen.getByTestId('custom-editor-name-input'), 'abandoned');

    reRenderComponent(false);
    reRenderComponent(true);

    expect(screen.getByTestId('custom-editor-name-input')).toHaveValue('');
    expect(screen.getByTestId('custom-editor-image-input')).toHaveValue('');
  });
});
