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

import { yaml } from '@codemirror/lang-yaml';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';
import { githubDark } from '@uiw/codemirror-theme-github';
import CodeMirror from '@uiw/react-codemirror';
import React from 'react';

import styles from '@/components/ManifestViewer/index.module.css';
import { useDashboardTheme } from '@/hooks/useDashboardTheme';

export type Props = {
  /** The YAML to show. */
  value: string;
  id: string;
  isExpanded: boolean;
};

const createLightTheme = () =>
  EditorView.theme(
    {
      '&': {
        color: '#2e3440',
        backgroundColor: '#fff',
      },
      '.cm-activeLine': {
        backgroundColor: 'inherit',
      },
      '.cm-gutters': {
        backgroundColor: '#f7f7f7',
        color: '#636363',
      },
      '.cm-activeLineGutter': {
        backgroundColor: '#f7f7f7',
      },
    },
    { dark: false },
  );

const createDarkGutterTheme = () =>
  EditorView.theme(
    {
      '.cm-gutters': {
        backgroundColor: '#161b22',
        color: '#8b949e',
      },
      '.cm-activeLineGutter': {
        backgroundColor: '#161b22',
      },
    },
    { dark: true },
  );

const createLightHighlightStyle = () =>
  HighlightStyle.define([
    { tag: t.keyword, color: '#4c7399' },
    { tag: [t.string], color: '#4c7399' },
    { tag: [t.variableName], color: '#008080' },
    {
      tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName],
      color: '#008080',
    },
  ]);

/**
 * Read-only YAML view, the same editor the dashboard shows a devfile in.
 *
 * It follows the dashboard theme rather than a prop, so the colours stay in
 * step with the masthead when the theme is switched while the tab is open.
 */
export function ManifestViewer({ value, id, isExpanded }: Props): React.ReactElement {
  const { isDarkTheme } = useDashboardTheme();

  const lightTheme = React.useMemo(() => createLightTheme(), []);
  const darkGutterTheme = React.useMemo(() => createDarkGutterTheme(), []);
  const lightHighlightStyle = React.useMemo(() => createLightHighlightStyle(), []);

  const extensions = React.useMemo(() => {
    const baseExtensions = [
      EditorView.contentAttributes.of({ 'aria-label': 'Sandbox manifest' }),
      yaml(),
    ];
    return isDarkTheme
      ? [darkGutterTheme, ...baseExtensions]
      : [lightTheme, syntaxHighlighting(lightHighlightStyle), ...baseExtensions];
  }, [isDarkTheme, darkGutterTheme, lightTheme, lightHighlightStyle]);

  return (
    <div
      className={isExpanded ? styles.manifestViewerExpanded : styles.manifestViewer}
      data-testid="sandbox-manifest"
    >
      <CodeMirror
        readOnly={true}
        id={id}
        value={value}
        theme={isDarkTheme ? githubDark : undefined}
        extensions={extensions}
      />
    </div>
  );
}
