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

import { Workspace } from '@/services/workspace-adapter';

export type Props = {
  workspace: Workspace;
  readonly: boolean;
  onSave: (workspaceName: string) => void;
};

export default class WorkspaceNameFormGroup extends React.PureComponent<Props> {
  render() {
    const { workspace, readonly, onSave } = this.props;
    return (
      <div data-testid="mock-workspace-name">
        <span data-testid="workspace-name-value">{workspace.name}</span>
        <span data-testid="workspace-name-readonly">{String(readonly)}</span>
        {!readonly && (
          <button data-testid="mock-rename-button" onClick={() => onSave('renamed-workspace')}>
            Change workspace name
          </button>
        )}
      </div>
    );
  }
}
