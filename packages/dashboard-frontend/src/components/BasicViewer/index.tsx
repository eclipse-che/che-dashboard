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
      this.editor = CodeMirror.fromTextArea(parent as HTMLTextAreaElement, {
        lineNumbers: false,
        lineWrapping: false,
        readOnly: true,
        value: this.props.value,
      });
    }
  }

  componentDidUpdate(): void {
    if (this.editor) {
      this.editor.setValue(this.props.value);
      this.editor.refresh();
    }
  }

  public render(): React.ReactElement {
    return (
      <div className={styles.basicViewer}>
        <textarea
          id={this.props.id}
          data-testid={this.props.id}
          value={this.props.value}
          readOnly={true}
        ></textarea>
      </div>
    );
  }
}
