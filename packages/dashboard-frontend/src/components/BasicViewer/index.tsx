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

import CodeMirror from 'codemirror';
import React from 'react';

import styles from '@/components/BasicViewer/index.module.css';

export type Props = {
  value: string;
  id: string;
};

export class BasicViewer extends React.PureComponent<Props> {
  private editor: CodeMirror.Editor | undefined;

  public componentDidMount(): void {
    const parent = window.document.querySelector(`#${this.props.id}`);
    if (parent) {
      const editor = new CodeMirror.fromTextArea(parent, {
        lineNumbers: false,
        lineWrapping: false,
        readOnly: true,
        autoRefresh: true,
        autofocus: true,
      });
      editor.setSize(`100%`, `100%`);
      editor.setValue(this.props.value);

      this.editor = editor;
    }
  }

  componentDidUpdate(prevProps: Readonly<Props>): void {
    if (this.editor && this.props.value !== prevProps.value) {
      this.editor.setValue(this.props.value);
    }
  }

  public render(): React.ReactElement {
    return (
      <div className={styles.basicViewer}>
        <textarea id={this.props.id} value={this.props.value} readOnly={true}></textarea>
      </div>
    );
  }
}
