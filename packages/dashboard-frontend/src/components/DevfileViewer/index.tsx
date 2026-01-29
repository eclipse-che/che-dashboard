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
import CodeMirror from '@uiw/react-codemirror';
import React, { useMemo } from 'react';

import styles from '@/components/DevfileViewer/index.module.css';
import { useTheme } from '@/contexts/ThemeContext';

export type Props = {
  isActive: boolean;
  isExpanded: boolean;
  value: string;
  id: string;
};

const createTheme = (isDark: boolean) => {
  return EditorView.theme(
    {
      '&': {
        color: isDark ? '#e5e9f0' : '#2e3440',
        backgroundColor: isDark ? '#1e1e1e' : '#fff',
      },
      '.cm-activeLine': {
        backgroundColor: 'inherit',
      },
      '.cm-gutters': {
        backgroundColor: isDark ? '#2b2b2b' : '#f7f7f7',
        color: isDark ? '#6e7681' : '#999',
      },
      '.cm-activeLineGutter': {
        backgroundColor: isDark ? '#2b2b2b' : '#f7f7f7',
      },
    },
    { dark: isDark },
  );
};

const createHighlightStyle = (isDark: boolean) => {
  return HighlightStyle.define([
    { tag: t.keyword, color: isDark ? '#88c0d0' : '#5e81ac' },
    { tag: [t.string], color: isDark ? '#a3be8c' : '#5e81ac' },
    { tag: [t.variableName], color: isDark ? '#81a1c1' : '#008080' },
    {
      tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName],
      color: isDark ? '#88c0d0' : '#008080',
    },
  ]);
};

export const DevfileViewer: React.FC<Props> = ({ isActive, isExpanded, value, id }) => {
  const { isDarkTheme } = useTheme();

  const theme = useMemo(() => createTheme(isDarkTheme), [isDarkTheme]);
  const highlightStyle = useMemo(() => createHighlightStyle(isDarkTheme), [isDarkTheme]);

  return (
    <div className={styles.devfileViewer}>
      <CodeMirror
        className={styles.codeMirror}
        readOnly={true}
        id={id}
        value={value}
        extensions={[theme, syntaxHighlighting(highlightStyle), yaml()]}
      />
    </div>
  );
};
