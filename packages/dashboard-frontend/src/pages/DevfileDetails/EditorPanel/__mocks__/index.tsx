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
    <button onClick={props.onRefresh}>Refresh</button>
    <button onClick={props.onSave} disabled={props.isSaved || props.hasValidationError}>
      Save
    </button>
    <button onClick={props.onCreateWorkspace} disabled={!props.isSaved || props.hasValidationError}>
      Create Workspace
    </button>
  </div>
);
export default EditorPanel;
