/*
 * Copyright (c) 2018-2024 Red Hat, Inc.
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
import React from 'react';

import styles from '@/components/DevfileViewer/index.module.css';

export type Props = {
  isActive: boolean;
  isExpanded: boolean;
  value: string;
  id: string;
};

export class DevfileViewer extends React.PureComponent<Props> {
  public static theme = EditorView.theme(
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

  public static highlightStyle = HighlightStyle.define([
    { tag: t.keyword, color: '#5e81ac' },
    { tag: [t.string], color: '#5e81ac' },
    { tag: [t.variableName], color: '#008080' },
    {
      tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName],
      color: '#008080',
    },
  ]);

  public render(): React.ReactElement {
    return (
      <div className={styles.devfileViewer}>
        <CodeMirror
          className={styles.codeMirror}
          readOnly={true}
          id={this.props.id}
          value={this.props.value}
          extensions={[
            DevfileViewer.theme,
            syntaxHighlighting(DevfileViewer.highlightStyle),
            yaml(),
          ]}
        />
      </div>
    );
  }
}
