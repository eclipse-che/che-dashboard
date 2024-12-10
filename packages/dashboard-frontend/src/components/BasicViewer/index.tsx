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

import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import React from 'react';

import styles from '@/components/BasicViewer/index.module.css';

export type Props = {
  value: string;
  id: string;
};

export class BasicViewer extends React.PureComponent<Props> {
  private editor: EditorView | undefined;

  public componentDidMount(): void {
    const parent = window.document.querySelector(`#${this.props.id}`);
    if (parent) {
      const state = this.getEditorState();
      this.editor = new EditorView({
        state,
        parent,
      });
    }
  }

  public componentWillUnmount(): void {
    if (this.editor) {
      this.editor.destroy();
    }
  }

  componentDidUpdate(prevProps: Readonly<Props>): void {
    if (this.editor && this.props.value !== prevProps.value) {
      const state = this.getEditorState();
      this.editor.setState(state);
    }
  }

  private getEditorState(): EditorState {
    return EditorState.create({
      doc: this.props.value,
      extensions: [syntaxHighlighting(defaultHighlightStyle), EditorState.readOnly.of(true)],
    });
  }

  public render(): React.ReactElement {
    return (
      <div className={styles.basicViewer}>
        <div id={this.props.id}></div>
      </div>
    );
  }
}
