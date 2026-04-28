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

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import EditorPanel, { Props } from '@/pages/DevfileDetails/EditorPanel';

jest.mock('@/components/DevfileEditor', () => ({
  DevfileEditor: function MockDevfileEditor(props: {
    value: string;
    onChange?: (val: string) => void;
    readOnly?: boolean;
  }) {
    return (
      <textarea
        data-testid="devfile-editor"
        value={props.value}
        readOnly={props.readOnly}
        onChange={e => props.onChange?.(e.target.value)}
      />
    );
  },
}));
jest.mock('@/components/DevfileEditorTools', () => {
  return function MockDevfileEditorTools() {
    return <div data-testid="devfile-editor-tools">Devfile Editor Tools</div>;
  };
});

const mockOnSave = jest.fn();
const mockOnRefresh = jest.fn();
const mockOnCreateWorkspace = jest.fn();
const mockOnExpandToggle = jest.fn();
const mockOnEditorChange = jest.fn();

const defaultProps: Props = {
  devfileName: 'test-devfile',
  editorContent: 'schemaVersion: 2.2.0\nmetadata:\n  name: test-devfile\n',
  isExpanded: false,
  onExpandToggle: mockOnExpandToggle,
  onSave: mockOnSave,
  onRefresh: mockOnRefresh,
  onCreateWorkspace: mockOnCreateWorkspace,
  onEditorChange: mockOnEditorChange,
  isSaved: true,
  hasValidationError: false,
};

function renderComponent(overrides?: Partial<Props>) {
  return render(<EditorPanel {...defaultProps} {...overrides} />);
}

describe('EditorPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render the editor panel', () => {
    renderComponent();
    expect(screen.getByTestId('editor-panel')).toBeDefined();
  });

  test('should render the DevfileEditor', () => {
    renderComponent();
    expect(screen.getByTestId('devfile-editor')).toBeDefined();
  });

  test('should render the DevfileEditorTools', () => {
    renderComponent();
    expect(screen.getByTestId('devfile-editor-tools')).toBeDefined();
  });

  test('should render Save button', () => {
    renderComponent();
    expect(screen.getByTestId('save-button')).toBeDefined();
  });

  test('should render Refresh button', () => {
    renderComponent();
    expect(screen.getByTestId('refresh-button')).toBeDefined();
  });

  test('should render Create Workspace button by default', () => {
    renderComponent();
    expect(screen.getByTestId('action-button')).toBeDefined();
    expect(screen.getByText('Create Workspace')).toBeDefined();
  });

  test('should disable Save button when isSaved is true', () => {
    renderComponent({ isSaved: true });
    expect(screen.getByTestId('save-button')).toBeDisabled();
  });

  test('should enable Save button when isSaved is false', () => {
    renderComponent({ isSaved: false });
    expect(screen.getByTestId('save-button')).not.toBeDisabled();
  });

  test('should disable Save button when there is a validation error', () => {
    renderComponent({ isSaved: false, hasValidationError: true });
    expect(screen.getByTestId('save-button')).toBeDisabled();
  });

  test('should call onSave when Save button is clicked', async () => {
    renderComponent({ isSaved: false });
    await userEvent.click(screen.getByTestId('save-button'));
    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });

  test('should call onRefresh when Refresh button is clicked', async () => {
    renderComponent();
    await userEvent.click(screen.getByTestId('refresh-button'));
    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });

  test('should call onCreateWorkspace when Create Workspace button is clicked', async () => {
    renderComponent({ isSaved: true, hasValidationError: false });
    await userEvent.click(screen.getByTestId('action-button'));
    expect(mockOnCreateWorkspace).toHaveBeenCalledTimes(1);
  });

  test('should hide toolbar when readOnly is true', () => {
    renderComponent({ readOnly: true });
    expect(screen.queryByTestId('save-button')).toBeNull();
    expect(screen.queryByTestId('refresh-button')).toBeNull();
  });

  test('should show toolbar when readOnly is true but alwaysShowToolbar is true', () => {
    renderComponent({ readOnly: true, alwaysShowToolbar: true });
    expect(screen.getByTestId('save-button')).toBeDefined();
  });

  test('should render custom action button label', () => {
    renderComponent({ actionButtonLabel: 'Run Agent' });
    expect(screen.getByText('Run Agent')).toBeDefined();
  });

  test('should disable action button when actionButtonDisabled is true', () => {
    renderComponent({ actionButtonDisabled: true });
    expect(screen.getByTestId('action-button')).toBeDisabled();
  });

  test('should disable Refresh button when readOnly is true and alwaysShowToolbar is true', () => {
    renderComponent({ readOnly: true, alwaysShowToolbar: true });
    expect(screen.getByTestId('refresh-button')).toBeDisabled();
  });
});
