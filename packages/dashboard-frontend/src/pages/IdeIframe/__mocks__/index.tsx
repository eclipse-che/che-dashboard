/*
 * Copyright (c) 2018-2021 Red Hat, Inc.
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
import { Props } from '..';

export const iframeWorkspaceId = 'iframe-workspace-id';

export class IdeIframe extends React.Component<Props> {
  render(): React.ReactElement {
    return (
      <div data-testid="ide-iframe">
        <div data-testid="ideUrl">{this.props.ideUrl}</div>
        <div data-testid="isDevWorkspace">{this.props.isDevWorkspace}</div>
        <button onClick={() => this.props.onOpenWorkspacesList()}>Open Workspaces List</button>
        <button onClick={() => this.props.onWorkspaceRestartFromIframe(iframeWorkspaceId)}>
          Restart Workspace
        </button>
      </div>
    );
  }
}
