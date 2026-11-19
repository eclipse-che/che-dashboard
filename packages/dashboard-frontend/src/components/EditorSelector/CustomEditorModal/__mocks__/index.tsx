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

import { Props } from '@/components/EditorSelector/CustomEditorModal';

export class CustomEditorModal extends React.PureComponent<Props> {
  render(): React.ReactElement {
    const { isOpen, onSave } = this.props;

    return (
      <div data-testid="custom-editor-modal-mock">
        CustomEditorModal Mock
        <span data-testid="custom-editor-modal-is-open">{isOpen.toString()}</span>
        <button
          data-testid="custom-editor-modal-save"
          onClick={() => onSave('che-code', 'schemaVersion: 2.2.2', 'quay.io/my/editor')}
        >
          Save
        </button>
      </div>
    );
  }
}

export default CustomEditorModal;
