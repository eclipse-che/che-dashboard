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

import { Props } from '@/pages/UserPreferences/GitConfig/Toolbar';

export class GitConfigToolbar extends React.PureComponent<Props> {
  render() {
    const { mode, onAdd, onChangeMode } = this.props;
    const nextMode = mode === 'form' ? 'viewer' : 'form';
    return (
      <div>
        Mock Git Config Toolbar
        <span data-testid="toolbar-mode">{mode}</span>
        <button data-testid="toolbar-on-add" onClick={onAdd}>
          Add
        </button>
        <button data-testid="toolbar-on-change-mode" onClick={() => onChangeMode(nextMode)}>
          Switch Mode
        </button>
      </div>
    );
  }
}
