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

import React from 'react';

import { DevfileViewer } from '@/components/DevfileViewer';
import { useTheme } from '@/contexts/ThemeContext';
import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const mockUseTheme = useTheme as jest.Mock;

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

const sampleDevfile = 'schemaVersion: 2.2.0\nmetadata:\n  name: test-workspace';

describe('DevfileViewer', () => {
  beforeEach(() => {
    mockUseTheme.mockReturnValue({
      themePreference: 'LIGHT',
      isDarkTheme: false,
      setThemePreference: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('snapshot with light theme', () => {
    const snapshot = createSnapshot(sampleDevfile);
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  test('renders content in light theme', () => {
    renderComponent(sampleDevfile);

    const textbox = screen.getByRole('textbox');
    expect(textbox).toHaveTextContent('schemaVersion');
  });

  test('renders content in dark theme', () => {
    mockUseTheme.mockReturnValue({
      themePreference: 'DARK',
      isDarkTheme: true,
      setThemePreference: jest.fn(),
    });

    renderComponent(sampleDevfile);

    const textbox = screen.getByRole('textbox');
    expect(textbox).toHaveTextContent('schemaVersion');
  });

  test('handles content change', () => {
    const { reRenderComponent } = renderComponent(sampleDevfile);

    const textbox = screen.getByRole('textbox');
    expect(textbox).toHaveTextContent('test-workspace');

    const updatedDevfile = 'schemaVersion: 2.2.0\nmetadata:\n  name: updated-workspace';
    reRenderComponent(updatedDevfile);

    expect(textbox).toHaveTextContent('updated-workspace');
  });
});

function getComponent(value: string): React.ReactElement {
  return <DevfileViewer id="devfile-viewer-id" isActive={true} isExpanded={true} value={value} />;
}
