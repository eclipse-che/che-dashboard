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
import { Provider } from 'react-redux';

import { Workspace } from '@/services/workspace-adapter';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';

type Props = {
  workspace: Workspace;
  readonly: boolean;
  onSave: (workspaceName: string) => void;
};

class _WorkspaceNameFormGroup extends React.PureComponent<Props> {
  render() {
    return (
      <div>
        Mock Workspace Name Form
        {!this.props.readonly && (
          <button onClick={() => this.props.onSave('new-name')}>Edit Workspace Name</button>
        )}
        <span>Workspace: {this.props.workspace.name}</span>
      </div>
    );
  }
}

export default function WorkspaceNameFormGroup(props: Props) {
  const store = new MockStoreBuilder().build();
  return (
    <Provider store={store}>
      <_WorkspaceNameFormGroup {...props} />
    </Provider>
  );
}
