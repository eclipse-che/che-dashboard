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

import {
  EmptyState,
  EmptyStateIcon,
  EmptyStateVariant,
  TextContent,
  Title,
} from '@patternfly/react-core';
import { CogIcon } from '@patternfly/react-icons';
import React from 'react';

import { DevfileViewer } from '@/components/DevfileViewer';
import EditorTools from '@/components/EditorTools';
import styles from '@/pages/WorkspaceDetails/DevfileEditorTab/index.module.css';
import { Workspace } from '@/services/workspace-adapter';
import { DEVWORKSPACE_DEVFILE } from '@/services/workspace-client/devworkspace/devWorkspaceClient';

export type Props = {
  workspace: Workspace;
  isActive: boolean;
};

export type State = {
  isExpanded: boolean;
  copied?: boolean;
};

export default class DevfileEditorTab extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      isExpanded: false,
    };
  }

  public render(): React.ReactElement {
    const { isExpanded } = this.state;
    const editorTabStyle = isExpanded ? styles.editorTabExpanded : styles.editorTab;
    const devfileStr = this.props.workspace.ref.metadata?.annotations?.[DEVWORKSPACE_DEVFILE] || '';
    const name = this.props.workspace.name;

    return (
      <React.Fragment>
        <br />
        <TextContent className={editorTabStyle}>
          {devfileStr && (
            <>
              <EditorTools
                contentText={devfileStr}
                workspaceName={name}
                handleExpand={isExpanded => {
                  this.setState({ isExpanded });
                }}
              />
              <DevfileViewer
                isActive={this.props.isActive}
                isExpanded={isExpanded}
                value={devfileStr}
                id="devfileViewerId"
              />
            </>
          )}
          {!devfileStr && (
            <EmptyState isFullHeight={true} variant={EmptyStateVariant.small}>
              <EmptyStateIcon icon={CogIcon} />
              <Title headingLevel="h4" size="lg">
                No Data Found
              </Title>
            </EmptyState>
          )}
        </TextContent>
      </React.Fragment>
    );
  }
}
