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
import CodeMirror from '@uiw/react-codemirror';
import React, { useMemo } from 'react';

import styles from '@/components/BasicViewer/index.module.css';
import { useTheme } from '@/contexts/ThemeContext';

export type Props = {
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

export const BasicViewer: React.FC<Props> = ({ value, id }) => {
  const { isDarkTheme } = useTheme();

  const theme = useMemo(() => createTheme(isDarkTheme), [isDarkTheme]);

  return (
    <div className={styles.basicViewer}>
      <CodeMirror
        id={id}
        readOnly={true}
        basicSetup={false}
        value={value}
        extensions={[theme]}
      />
    </div>
  );
};
