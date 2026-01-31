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

import { githubDark, githubLight } from '@uiw/codemirror-theme-github';
import CodeMirror from '@uiw/react-codemirror';
import React from 'react';

import styles from '@/components/BasicViewer/index.module.css';
import { useTheme } from '@/contexts/ThemeContext';

export type Props = {
  value: string;
  id: string;
};

export const BasicViewer: React.FC<Props> = ({ value, id }) => {
  const { isDarkTheme } = useTheme();

  return (
    <div className={styles.basicViewer}>
      <CodeMirror
        id={id}
        readOnly={true}
        basicSetup={false}
        value={value}
        theme={isDarkTheme ? githubDark : githubLight}
      />
    </div>
  );
};
