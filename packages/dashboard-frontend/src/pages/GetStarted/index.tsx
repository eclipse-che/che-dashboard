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

import { Divider, PageSection, PageSectionVariants, Title } from '@patternfly/react-core';
import { History } from 'history';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';

import Head from '@/components/Head';
import EditorSelector from '@/pages/GetStarted/EditorSelector';
import ImportFromGit from '@/pages/GetStarted/ImportFromGit';
import SamplesList from '@/pages/GetStarted/SamplesList';

type Props = MappedProps & {
  history: History;
};

export class GetStarted extends React.PureComponent<Props> {
  render(): React.ReactNode {
    const { history } = this.props;

    const title = 'Create Workspace';

    return (
      <React.Fragment>
        <Head pageName="Create Workspace" />

        <PageSection variant={PageSectionVariants.light}>
          <Title headingLevel={'h1'}>{title}</Title>
        </PageSection>
        <Divider />
        <PageSection variant={PageSectionVariants.default}>
          <PageSection variant={PageSectionVariants.light}>
            <EditorSelector />
          </PageSection>
          <PageSection
            variant={PageSectionVariants.light}
            style={{ marginTop: 'var(--pf-c-page__main-section--PaddingTop)' }}
          >
            <ImportFromGit history={history} />
          </PageSection>
          <PageSection
            variant={PageSectionVariants.light}
            style={{ marginTop: 'var(--pf-c-page__main-section--PaddingTop)' }}
          >
            <SamplesList history={history} />
          </PageSection>
        </PageSection>
      </React.Fragment>
    );
  }
}

const connector = connect();

type MappedProps = ConnectedProps<typeof connector>;
export default connector(GetStarted);
