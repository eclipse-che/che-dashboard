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

import { Props } from '@/components/EditorSelector/Dropdown';

export class EditorDropdown extends React.PureComponent<Props> {
  public render() {
    const {
      defaultEditorId,
      selectedEditorId,
      customEditorName,
      onSelect,
      onDefaultEditorClick,
      onCustomEditorClick,
    } = this.props;

    return (
      <div>
        <dl data-testid="editor-gallery-content">
          <dt>default-editor-id</dt>
          <dd data-testid="default-editor-id">{defaultEditorId}</dd>
          <dt>selected-editor-id</dt>
          <dd data-testid="selected-editor-id">{selectedEditorId}</dd>
          <dt>custom-editor-name</dt>
          <dd data-testid="custom-editor-name">{customEditorName || 'none'}</dd>
        </dl>
        <button
          data-testid="default-editor-button"
          onClick={() => {
            onDefaultEditorClick();
          }}
        >
          Default Editor
        </button>
        <button
          data-testid="select-editor-button"
          onClick={() => {
            onSelect('che-incubator/che-code/latest');
          }}
        >
          Select Editor
        </button>
        <button
          data-testid="custom-editor-button"
          onClick={() => {
            onCustomEditorClick();
          }}
        >
          Custom Editor
        </button>
      </div>
    );
  }
}

export default EditorDropdown;
