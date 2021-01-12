/*
 * Copyright (c) 2018-2020 Red Hat, Inc.
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
import { PageSection, Text, TextVariants, FlexItem, Flex, PageSectionVariants } from '@patternfly/react-core';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import { ROUTE } from '../../../route.enum';
import WorkspaceStatusLabel from '../../../components/WorkspaceStatusLabel';

import styles from './Header.module.css';

type Props = {
  status: string | undefined;
  workspaceName: string;
};

class Header extends React.PureComponent<Props> {

  public render(): React.ReactElement {
    const { workspaceName, status, children } = this.props;

    return (
      <PageSection variant={PageSectionVariants.light} className={styles.workspaceDetailsHeader}>
        <Breadcrumb>
          <BreadcrumbItem to={`./#${ROUTE.WORKSPACES}`}>
            Workspaces
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{workspaceName}</BreadcrumbItem>
        </Breadcrumb>
        <Flex>
          <FlexItem>
            <Text component={TextVariants.h1}>
              {workspaceName}
              <WorkspaceStatusLabel status={status} />
            </Text>
          </FlexItem>
          <FlexItem align={{ default: 'alignRight' }}>
            {children}
          </FlexItem>
        </Flex>
      </PageSection>
    );
  }
}

export default Header;
