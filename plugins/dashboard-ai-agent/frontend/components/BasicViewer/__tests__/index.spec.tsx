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

import { BasicViewer, Props } from '@/components/BasicViewer';

jest.unmock('@/components/BasicViewer');

// These need to be declared with `var` so they are hoisted before jest.mock
// (jest.mock is hoisted by babel-jest to the top of the file)
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

jest.mock('@codemirror/theme-one-dark', () => ({
  oneDark: 'one-dark-theme',
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
    value: 'line 1\nline 2\nline 3',
    id: 'basic-viewer-id',
  };
  return render(<BasicViewer {...defaultProps} {...overrides} />);
}

describe('BasicViewer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsDarkTheme = false;
    mockDocToString.mockReturnValue('');
  });

  test('renders a container with the correct id', () => {
    renderComponent();

    const container = document.getElementById('basic-viewer-id');
    expect(container).toBeTruthy();
  });

  test('renders with basicViewer class', () => {
    renderComponent();

    const container = document.getElementById('basic-viewer-id');
    expect(container?.className).toContain('basicViewer');
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

  test('creates EditorState with correct doc', () => {
    const { EditorState } = jest.requireMock<{ EditorState: { create: jest.Mock } }>(
      '@codemirror/state',
    );

    renderComponent();

    expect(EditorState.create).toHaveBeenCalledWith(
      expect.objectContaining({
        doc: 'line 1\nline 2\nline 3',
      }),
    );
  });

  test('uses light theme when isDarkTheme is false', () => {
    mockIsDarkTheme = false;
    renderComponent();

    const callArgs = mockCompartmentOf.mock.calls;
    const hasOneDark = callArgs.some((args: unknown[]) => args[0] === 'one-dark-theme');
    expect(hasOneDark).toBe(false);
  });

  test('uses dark theme when isDarkTheme is true', () => {
    mockIsDarkTheme = true;
    renderComponent();

    expect(mockCompartmentOf).toHaveBeenCalledWith('one-dark-theme');
  });

  test('dispatches theme reconfigure when isDarkTheme changes', () => {
    mockIsDarkTheme = false;
    const { rerender } = renderComponent();

    mockViewDispatch.mockClear();
    mockReconfigure.mockClear();

    mockIsDarkTheme = true;
    rerender(<BasicViewer value="line 1\nline 2\nline 3" id="basic-viewer-id" />);

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

    mockViewDispatch.mockClear();

    rerender(<BasicViewer value="new content" id="basic-viewer-id" />);

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

    rerender(<BasicViewer value={content} id="basic-viewer-id" />);

    const contentChangeCalls = mockViewDispatch.mock.calls.filter(
      (call: unknown[]) => (call[0] as Record<string, unknown>).changes !== undefined,
    );
    expect(contentChangeCalls).toHaveLength(0);
  });

  test('destroys EditorView on unmount', () => {
    const { unmount } = renderComponent();

    unmount();

    expect(mockViewDestroy).toHaveBeenCalled();
  });

  test('renders with different id', () => {
    renderComponent({ id: 'custom-id' });

    const container = document.getElementById('custom-id');
    expect(container).toBeTruthy();
  });
});
