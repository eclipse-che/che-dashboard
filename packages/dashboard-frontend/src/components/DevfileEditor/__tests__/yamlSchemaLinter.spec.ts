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

import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { createDevfileSchemaLinter } from '@/components/DevfileEditor/yamlSchemaLinter';

describe('createDevfileSchemaLinter', () => {
  test('creates an extension without schema', () => {
    const linter = createDevfileSchemaLinter(undefined);
    expect(linter).toBeDefined();
  });

  test('can be added to editor state without errors', () => {
    const linter = createDevfileSchemaLinter(undefined);
    const state = EditorState.create({
      doc: 'schemaVersion: 2.2.2\n',
      extensions: [linter],
    });
    expect(state).toBeDefined();
    expect(state.doc.toString()).toBe('schemaVersion: 2.2.2\n');
  });

  test('can be used with EditorView', () => {
    const container = document.createElement('div');
    const linter = createDevfileSchemaLinter(undefined);
    const state = EditorState.create({
      doc: 'schemaVersion: 2.2.2\n',
      extensions: [linter],
    });
    const view = new EditorView({ state, parent: container });
    expect(view).toBeDefined();
    view.destroy();
  });
});
