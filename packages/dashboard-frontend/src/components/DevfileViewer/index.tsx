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
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { Compartment, EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';
import { basicSetup } from 'codemirror';
import React, { useCallback, useEffect, useRef } from 'react';

import styles from '@/components/DevfileViewer/index.module.css';
import { useTheme } from '@/contexts/ThemeContext';

export type Props = {
  isActive: boolean;
  isExpanded: boolean;
  value: string;
  id: string;
};

const themeCompartment = new Compartment();

const lightTheme = EditorView.theme(
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

const lightHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: '#5e81ac' },
  { tag: [t.string], color: '#5e81ac' },
  { tag: [t.variableName], color: '#008080' },
  {
    tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName],
    color: '#008080',
  },
]);

const cheLight = [lightTheme, syntaxHighlighting(lightHighlightStyle)];

export const DevfileViewer: React.FC<Props> = ({ value, id, isActive }) => {
  const { isDarkTheme } = useTheme();
  const viewRef = useRef<EditorView | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: themeCompartment.reconfigure(isDarkTheme ? oneDark : cheLight),
      });
    }
  }, [isDarkTheme]);

  useEffect(() => {
    if (viewRef.current) {
      const currentContent = viewRef.current.state.doc.toString();
      if (value !== currentContent) {
        viewRef.current.dispatch({
          changes: { from: 0, to: currentContent.length, insert: value },
        });
      }
    }
  }, [value]);

  // When the tab becomes active, force CodeMirror to recalculate dimensions.
  // Without this, CodeMirror initializes with 0 height inside a hidden tab.
  useEffect(() => {
    if (isActive && viewRef.current) {
      viewRef.current.requestMeasure();
    }
  }, [isActive]);

  const containerRefCallback = useCallback(
    (node: HTMLDivElement | null) => {
      if (containerRef.current === node) {
        return;
      }
      containerRef.current = node;

      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }

      if (!node) {
        return;
      }

      const state = EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          yaml(),
          themeCompartment.of(isDarkTheme ? oneDark : cheLight),
          EditorState.readOnly.of(true),
          EditorView.lineWrapping,
        ],
      });

      viewRef.current = new EditorView({ state, parent: node });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div className={styles.devfileViewer}>
      <div id={id} ref={containerRefCallback} />
    </div>
  );
};
