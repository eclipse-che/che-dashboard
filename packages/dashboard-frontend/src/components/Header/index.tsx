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

import {
  Breadcrumb,
  BreadcrumbItem,
  Content,
  Flex,
  FlexItem,
  PageSection,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import React from 'react';

import { WorkspaceStatusLabel } from '@/components/Workspace/Status/Label';
import styles from '@/pages/WorkspaceDetails/Header/index.module.css';
import {
  DeprecatedWorkspaceStatus,
  DevWorkspaceStatus,
  WorkspaceStatus,
} from '@/services/helpers/types';

// Note: PageSectionVariants.default was removed in PF6

type Props = {
  hideBreadcrumbs?: boolean;
  status: WorkspaceStatus | DevWorkspaceStatus | DeprecatedWorkspaceStatus;
  title: string;
};

class Header extends React.PureComponent<Props> {
  private handleClick(): void {
    // clear browsing attribute
    window.name = '';
  }

  public render(): React.ReactElement {
    const { title, status, hideBreadcrumbs } = this.props;

    return (
      <PageSection>
        <Stack hasGutter={true}>
          {!hideBreadcrumbs && (
            <StackItem>
              <Breadcrumb className={styles.breadcrumb}>
                <BreadcrumbItem to={'/dashboard/'} onClick={() => this.handleClick()}>
                  Workspaces
                </BreadcrumbItem>
                <BreadcrumbItem isActive>{title}</BreadcrumbItem>
              </Breadcrumb>
            </StackItem>
          )}
          <StackItem>
            <Flex>
              <FlexItem alignSelf={{ default: 'alignSelfCenter' }}>
                <Content>
                  <Content component="h1">{title}</Content>
                </Content>
              </FlexItem>
              <FlexItem>
                <WorkspaceStatusLabel status={status} />
              </FlexItem>
            </Flex>
          </StackItem>
        </Stack>
      </PageSection>
    );
  }
}

export default Header;
