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

import { EditorView } from '@codemirror/view';
import { githubDark } from '@uiw/codemirror-theme-github';
import CodeMirror from '@uiw/react-codemirror';
import React, { useMemo } from 'react';

import styles from '@/components/BasicViewer/index.module.css';
import { useTheme } from '@/contexts/ThemeContext';

export type Props = {
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

export const BasicViewer: React.FC<Props> = ({ value, id }) => {
  const { isDarkTheme } = useTheme();

  const lightTheme = useMemo(() => createLightTheme(), []);

  return (
    <div className={styles.basicViewer}>
      <CodeMirror
        id={id}
        readOnly={true}
        basicSetup={false}
        value={value}
        theme={isDarkTheme ? githubDark : undefined}
        extensions={isDarkTheme ? [] : [lightTheme]}
      />
    </div>
  );
};
