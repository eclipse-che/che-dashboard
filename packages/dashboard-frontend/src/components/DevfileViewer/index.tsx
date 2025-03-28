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

import 'codemirror/mode/yaml/yaml';
import 'codemirror/lib/codemirror.css';
import '@/components/DevfileViewer/theme/eclipse-che.css';

import CodeMirror from 'codemirror';
import React from 'react';

import styles from '@/components/DevfileViewer/index.module.css';

export type Props = {
  isActive: boolean;
  isExpanded: boolean;
  value: string;
  id: string;
};

export class DevfileViewer extends React.PureComponent<Props> {
  private editor: CodeMirror.Editor | undefined;

  constructor(props: Props) {
    super(props);
  }

  public componentDidMount(): void {
    const parent = window.document.querySelector(`#${this.props.id}`);
    if (parent) {
      this.editor = CodeMirror.fromTextArea(parent as HTMLTextAreaElement, {
        mode: 'yaml',
        theme: 'eclipse-che',
        lineNumbers: true,
        lineWrapping: true,
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
      <div className={styles.devfileViewer}>
        <textarea id={this.props.id} value={this.props.value} readOnly={true}></textarea>
      </div>
    );
  }
}
