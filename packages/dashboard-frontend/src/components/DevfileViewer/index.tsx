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
import {
  defaultHighlightStyle,
  foldGutter,
  HighlightStyle,
  syntaxHighlighting,
} from '@codemirror/language';
import { EditorState, Extension } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';
import React from 'react';

import styles from '@/components/DevfileViewer/index.module.css';

const base00 = '#2e3440'; // black
const base01 = '#999'; // grey
const base02 = '#f7f7f7'; // white
const base03 = '#5e81ac'; // deep blue
const base04 = '#008080'; // teal
const base05 = '#fff'; // white
export const basicLightTheme = EditorView.theme(
  {
    '&': {
      color: base00,
      backgroundColor: base05,
    },
    '.cm-gutters': {
      backgroundColor: base02,
      color: base01,
    },
    '.cm-activeLineGutter': {
      backgroundColor: base02,
    },
  },
  { dark: false },
);
const basicLightHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: base03 },
  { tag: [t.string], color: base03 },
  { tag: [t.variableName], color: base04 },
  {
    tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName],
    color: base04,
  },
]);
const basicLight: Extension = [basicLightTheme, syntaxHighlighting(basicLightHighlightStyle)];
const minimalSetup: Extension = (() => [
  lineNumbers(),
  foldGutter(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
])();

export type Props = {
  isActive: boolean;
  isExpanded: boolean;
  value: string;
  id: string;
};

export class DevfileViewer extends React.PureComponent<Props> {
  private editor: EditorView | undefined;

  constructor(props: Props) {
    super(props);
  }

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
      extensions: [minimalSetup, EditorState.readOnly.of(true), yaml(), basicLight],
    });
  }

  public render(): React.ReactElement {
    return (
      <div className={styles.devfileViewer}>
        <div id={this.props.id}></div>
      </div>
    );
  }
}
