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
import React, { useMemo } from 'react';

import styles from '@/components/DevfileViewer/index.module.css';
import { useTheme } from '@/contexts/ThemeContext';

export type Props = {
  isActive: boolean;
  isExpanded: boolean;
  value: string;
  id: string;
};

const createLightTheme = () => {
  return EditorView.theme(
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
        color: '#999',
      },
      '.cm-activeLineGutter': {
        backgroundColor: '#f7f7f7',
      },
    },
    { dark: false },
  );
};

const createLightHighlightStyle = () => {
  return HighlightStyle.define([
    { tag: t.keyword, color: '#5e81ac' },
    { tag: [t.string], color: '#5e81ac' },
    { tag: [t.variableName], color: '#008080' },
    {
      tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName],
      color: '#008080',
    },
  ]);
};

export const DevfileViewer: React.FC<Props> = ({ value, id }) => {
  const { isDarkTheme } = useTheme();

  const lightTheme = useMemo(() => createLightTheme(), []);
  const lightHighlightStyle = useMemo(() => createLightHighlightStyle(), []);

  return (
    <div className={styles.devfileViewer}>
      <CodeMirror
        className={styles.codeMirror}
        readOnly={true}
        id={id}
        value={value}
        theme={isDarkTheme ? githubDark : undefined}
        extensions={
          isDarkTheme ? [yaml()] : [lightTheme, syntaxHighlighting(lightHighlightStyle), yaml()]
        }
      />
    </div>
  );
};
