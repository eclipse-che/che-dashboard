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
import { PageSection, PageSectionVariants, Text, TextContent, TextVariants } from '@patternfly/react-core';
import WorkspaceStatusLabel from '../WorkspaceStatusLabel';

const SECTION_THEME = PageSectionVariants.light;

type Props = {
  status?: string;
  title: string;
};

class Header extends React.PureComponent<Props> {

  public render(): React.ReactElement {
    const { title, status } = this.props;

    return (
      <PageSection variant={SECTION_THEME}>
        <TextContent>
          <Text component={TextVariants.h1}>
            {title}{status && (
              <WorkspaceStatusLabel status={status} />
            )}
          </Text>
        </TextContent>
      </PageSection>
    );
  }
}

export default Header;
