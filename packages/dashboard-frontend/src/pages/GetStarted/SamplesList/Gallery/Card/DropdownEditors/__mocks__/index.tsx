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

import React from 'react';

import { Props } from '@/pages/GetStarted/SamplesList/Gallery/Card/DropdownEditors';

export class DropdownEditors extends React.PureComponent<Props> {
  render(): React.ReactNode {
    const { editors, onEditorSelect } = this.props;
    return (
      <div data-testid="card-actions-dropdown">
        <div>spanDropdownEditors</div>
        {editors.map(editor => (
          <button
            data-testid="card-action"
            key={editor.id}
            onClick={() => onEditorSelect(editor.id)}
          >
            {editor.name}
          </button>
        ))}
        <button onClick={() => onEditorSelect(editors[0].id)}>Select Editor</button>
      </div>
    );
  }
}
