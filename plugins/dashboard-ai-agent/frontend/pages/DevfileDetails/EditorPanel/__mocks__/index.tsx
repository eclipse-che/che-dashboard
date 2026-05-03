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

import React from 'react';

import { Props } from '@/pages/DevfileDetails/EditorPanel';

const EditorPanel = (props: Props) => (
  <div data-testid="editor-panel">
    <span data-testid="editor-content">{props.editorContent}</span>
    <span data-testid="editor-is-saved">{String(props.isSaved)}</span>
    <span data-testid="editor-has-validation-error">{String(props.hasValidationError)}</span>
    <span data-testid="editor-is-expanded">{String(props.isExpanded)}</span>
    <button onClick={props.onRefresh}>Refresh</button>
    <button onClick={props.onSave} disabled={props.isSaved || props.hasValidationError}>
      Save
    </button>
    <button onClick={props.onCreateWorkspace} disabled={!props.isSaved || props.hasValidationError}>
      Create Workspace
    </button>
    <button onClick={props.onExpandToggle}>Toggle Expand</button>
    <button onClick={() => props.onEditorChange?.('changed-content')}>Change Editor</button>
    <button onClick={() => props.onValidation?.('validation error')}>Validate Error</button>
    <button onClick={() => props.onValidation?.('')}>Validate OK</button>
    <button onClick={() => props.onEditorFocusChange?.(true)}>Focus Editor</button>
    <button onClick={() => props.onEditorFocusChange?.(false)}>Blur Editor</button>
  </div>
);
export default EditorPanel;
