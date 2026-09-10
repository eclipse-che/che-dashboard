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

import { Props } from '@/pages/WorkspaceDetails/OverviewTab/Editor/SelectorModal';

export class EditorSelectorModal extends React.PureComponent<Props> {
  render() {
    const { isOpen, onConfirm, onClose, editors } = this.props;
    if (!isOpen) {
      return null;
    }
    const firstId = editors[0]?.id ?? '';
    return (
      <div data-testid="mock-editor-selector-modal">
        <button onClick={() => onConfirm(firstId)}>Confirm Editor</button>
        <button onClick={onClose}>Close Modal</button>
      </div>
    );
  }
}

export default EditorSelectorModal;
