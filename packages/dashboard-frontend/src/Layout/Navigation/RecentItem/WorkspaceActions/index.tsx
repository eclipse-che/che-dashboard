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

import { WorkspaceActionsConsumer } from '@/contexts/WorkspaceActions';
import { WorkspaceActionsDropdown } from '@/contexts/WorkspaceActions/Dropdown';
import { NavigationRecentItemObject } from '@/Layout/Navigation';

type Props = {
  item: NavigationRecentItemObject;
};

export class RecentItemWorkspaceActions extends React.PureComponent<Props> {
  constructor(props: Props) {
    super(props);
  }

  public render(): React.ReactElement {
    const { item } = this.props;

    return (
      <div
        onClick={e => {
          e.stopPropagation();
        }}
      >
        <WorkspaceActionsConsumer>
          {context => {
            return (
              <WorkspaceActionsDropdown
                context={context}
                toggle="kebab-toggle"
                workspace={item.workspace}
              />
            );
          }}
        </WorkspaceActionsConsumer>
      </div>
    );
  }
}
