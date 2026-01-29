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
import { githubDark, githubLight } from '@uiw/codemirror-themes';
import CodeMirror from '@uiw/react-codemirror';
import React from 'react';

import styles from '@/components/DevfileViewer/index.module.css';
import { useTheme } from '@/contexts/ThemeContext';

export type Props = {
  isActive: boolean;
  isExpanded: boolean;
  value: string;
  id: string;
};

export const DevfileViewer: React.FC<Props> = ({ isActive, isExpanded, value, id }) => {
  const { isDarkTheme } = useTheme();

  return (
    <div className={styles.devfileViewer}>
      <CodeMirror
        className={styles.codeMirror}
        readOnly={true}
        id={id}
        value={value}
        theme={isDarkTheme ? githubDark : githubLight}
        extensions={[yaml()]}
      />
    </div>
  );
};
