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

import { act, render, screen } from '@testing-library/react';
import React from 'react';

import { ManifestViewer } from '@/components/ManifestViewer';
import {
  DARK_THEME_CLASS,
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
  ThemePreference,
} from '@/services/theme';

const MANIFEST = 'kind: Sandbox\nmetadata:\n  name: hello-world\n';

function renderViewer(value = MANIFEST, isExpanded = false) {
  return render(<ManifestViewer id="manifest-viewer" value={value} isExpanded={isExpanded} />);
}

beforeEach(() => {
  window.localStorage.clear();
  // The document outlives each test, so the class the previous one applied
  // would otherwise decide the theme of the next.
  document.documentElement.classList.remove(DARK_THEME_CLASS);
});

describe('ManifestViewer', () => {
  it('shows the manifest', () => {
    renderViewer();

    expect(screen.getByRole('textbox')).toHaveTextContent('kind: Sandbox');
  });

  it('refuses edits, because a sandbox is changed through its actions', () => {
    renderViewer();

    // CodeMirror keeps the element focusable - it stays `contenteditable` so
    // the text can be selected - and announces the restriction with ARIA.
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-readonly', 'true');
  });

  it('names the content for a screen reader', () => {
    renderViewer();

    expect(screen.getByRole('textbox')).toHaveAttribute('aria-label', 'Sandbox manifest');
  });

  it('follows the manifest when the watch reports a new version', () => {
    const { rerender } = renderViewer();

    rerender(
      <ManifestViewer
        id="manifest-viewer"
        value={'kind: Sandbox\nmetadata:\n  name: renamed\n'}
        isExpanded={false}
      />,
    );

    expect(screen.getByRole('textbox')).toHaveTextContent('renamed');
  });

  it.each([false, true])('renders expanded=%s', isExpanded => {
    renderViewer(MANIFEST, isExpanded);

    // identity-obj-proxy maps a CSS module key to its own name.
    expect(screen.getByTestId('sandbox-manifest')).toHaveClass(
      isExpanded ? 'manifestViewerExpanded' : 'manifestViewer',
    );
  });

  describe('the theme', () => {
    it('starts on the theme the dashboard stored', () => {
      window.localStorage.setItem(THEME_STORAGE_KEY, ThemePreference.DARK);

      renderViewer();

      expect(screen.getByRole('textbox')).toHaveTextContent('kind: Sandbox');
      expect(document.documentElement).toHaveClass(DARK_THEME_CLASS);
    });

    it('follows the dashboard when the theme changes while the tab is open', () => {
      renderViewer();
      expect(document.documentElement).not.toHaveClass(DARK_THEME_CLASS);

      window.localStorage.setItem(THEME_STORAGE_KEY, ThemePreference.DARK);
      act(() => {
        window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
      });

      expect(document.documentElement).toHaveClass(DARK_THEME_CLASS);
      expect(screen.getByRole('textbox')).toHaveTextContent('kind: Sandbox');
    });
  });
});
