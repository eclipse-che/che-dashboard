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

import { render } from '@testing-library/react';
import React from 'react';

import { DevfileViewer, Props } from '@/components/DevfileViewer';

jest.unmock('@/components/DevfileViewer');

// These need to be declared before jest.mock calls since jest.mock is hoisted
// but the variable declarations with `var` keyword are also hoisted (unlike let/const)
/* eslint-disable no-var */
var mockViewDispatch: jest.Mock;
var mockViewDestroy: jest.Mock;
var mockDocToString: jest.Mock;
var mockEditorViewInstance: {
  dispatch: jest.Mock;
  destroy: jest.Mock;
  state: { doc: { toString: jest.Mock } };
};
var mockReconfigure: jest.Mock;
var mockCompartmentOf: jest.Mock;
/* eslint-enable no-var */

jest.mock('@codemirror/state', () => {
  mockReconfigure = jest.fn().mockReturnValue('reconfigure-effect');
  mockCompartmentOf = jest.fn().mockReturnValue('theme-extension');

  return {
    Compartment: jest.fn().mockImplementation(() => ({
      of: mockCompartmentOf,
      reconfigure: mockReconfigure,
    })),
    EditorState: {
      create: jest.fn().mockReturnValue('mock-state'),
      readOnly: {
        of: jest.fn().mockReturnValue('readonly-extension'),
      },
    },
  };
});

jest.mock('@codemirror/view', () => {
  mockViewDispatch = jest.fn();
  mockViewDestroy = jest.fn();
  mockDocToString = jest.fn().mockReturnValue('');
  mockEditorViewInstance = {
    dispatch: mockViewDispatch,
    destroy: mockViewDestroy,
    state: {
      doc: {
        toString: mockDocToString,
      },
    },
  };

  return {
    EditorView: Object.assign(
      jest.fn().mockImplementation(() => mockEditorViewInstance),
      {
        theme: jest.fn().mockReturnValue('light-theme'),
        lineWrapping: 'line-wrapping',
      },
    ),
  };
});

jest.mock('@codemirror/lang-yaml', () => ({
  yaml: jest.fn().mockReturnValue('yaml-extension'),
}));

jest.mock('@codemirror/language', () => ({
  HighlightStyle: {
    define: jest.fn().mockReturnValue('highlight-style'),
  },
  syntaxHighlighting: jest.fn().mockReturnValue('syntax-highlighting'),
}));

jest.mock('@codemirror/theme-one-dark', () => ({
  oneDark: 'one-dark-theme',
}));

jest.mock('@lezer/highlight', () => ({
  tags: {
    keyword: 'keyword',
    string: 'string',
    variableName: 'variableName',
    name: 'name',
    deleted: 'deleted',
    character: 'character',
    propertyName: 'propertyName',
    macroName: 'macroName',
  },
}));

jest.mock('codemirror', () => ({
  basicSetup: 'basic-setup-extension',
}));

let mockIsDarkTheme = false;
jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    isDarkTheme: mockIsDarkTheme,
  }),
}));

function renderComponent(overrides?: Partial<Props>) {
  const defaultProps: Props = {
    isActive: true,
    isExpanded: false,
    value: 'schemaVersion: 2.2.2\nmetadata:\n  name: test\n',
    id: 'test-viewer',
  };
  return render(<DevfileViewer {...defaultProps} {...overrides} />);
}

describe('DevfileViewer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsDarkTheme = false;
    mockDocToString.mockReturnValue('');
  });

  test('renders a container div with the correct id', () => {
    renderComponent();

    const container = document.getElementById('test-viewer');
    expect(container).toBeTruthy();
  });

  test('renders with devfileViewer class', () => {
    renderComponent();

    const container = document.getElementById('test-viewer');
    expect(container?.parentElement?.className).toContain('devfileViewer');
  });

  test('creates EditorView when container ref is set', () => {
    const { EditorView } = jest.requireMock<{ EditorView: jest.Mock }>('@codemirror/view');

    renderComponent();

    expect(EditorView).toHaveBeenCalledWith(
      expect.objectContaining({
        state: 'mock-state',
      }),
    );
  });

  test('creates EditorState with correct doc and extensions', () => {
    const { EditorState } = jest.requireMock<{ EditorState: { create: jest.Mock } }>(
      '@codemirror/state',
    );

    renderComponent();

    expect(EditorState.create).toHaveBeenCalledWith(
      expect.objectContaining({
        doc: 'schemaVersion: 2.2.2\nmetadata:\n  name: test\n',
      }),
    );
  });

  test('uses light theme compartment when isDarkTheme is false', () => {
    mockIsDarkTheme = false;
    renderComponent();

    // The compartment.of should be called with light theme (not oneDark)
    expect(mockCompartmentOf).toHaveBeenCalled();
  });

  test('uses dark theme compartment when isDarkTheme is true', () => {
    mockIsDarkTheme = true;
    renderComponent();

    expect(mockCompartmentOf).toHaveBeenCalledWith('one-dark-theme');
  });

  test('dispatches theme reconfigure when isDarkTheme changes', () => {
    mockIsDarkTheme = false;
    const { rerender } = renderComponent();

    // Clear calls from initial render
    mockViewDispatch.mockClear();
    mockReconfigure.mockClear();

    mockIsDarkTheme = true;
    rerender(
      <DevfileViewer
        isActive={true}
        isExpanded={false}
        value="schemaVersion: 2.2.2\nmetadata:\n  name: test\n"
        id="test-viewer"
      />,
    );

    expect(mockReconfigure).toHaveBeenCalledWith('one-dark-theme');
    expect(mockViewDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        effects: 'reconfigure-effect',
      }),
    );
  });

  test('dispatches content change when value prop changes', () => {
    mockDocToString.mockReturnValue('old content');
    const { rerender } = renderComponent({ value: 'old content' });

    // Clear dispatch calls from initial render
    mockViewDispatch.mockClear();

    rerender(
      <DevfileViewer isActive={true} isExpanded={false} value="new content" id="test-viewer" />,
    );

    expect(mockViewDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        changes: expect.objectContaining({
          from: 0,
          insert: 'new content',
        }),
      }),
    );
  });

  test('does not dispatch content change when value is the same', () => {
    const content = 'same content';
    mockDocToString.mockReturnValue(content);
    const { rerender } = renderComponent({ value: content });

    mockViewDispatch.mockClear();

    rerender(<DevfileViewer isActive={true} isExpanded={false} value={content} id="test-viewer" />);

    // dispatch should not be called for content changes
    const contentChangeCalls = mockViewDispatch.mock.calls.filter(
      (call: unknown[]) => (call[0] as Record<string, unknown>).changes !== undefined,
    );
    expect(contentChangeCalls).toHaveLength(0);
  });

  test('renders with different id', () => {
    renderComponent({ id: 'custom-viewer-id' });

    const container = document.getElementById('custom-viewer-id');
    expect(container).toBeTruthy();
  });

  test('destroys EditorView on unmount', () => {
    const { unmount } = renderComponent();

    unmount();

    expect(mockViewDestroy).toHaveBeenCalled();
  });
});
