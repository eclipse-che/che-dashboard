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
import styles from '@/pages/GetStarted/index.module.css';
import SamplesList from '@/pages/GetStarted/SamplesList';
import { AppState } from '@/store';
import { selectDefaultEditor } from '@/store/ServerConfig/selectors';

type Props = MappedProps & {
  history: History;
};
type State = {
  editorId: string;
};

export class GetStarted extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      editorId: props.defaultEditor,
    };
  }

  private handleSelectEditor(editorId: string): void {
    this.setState({ editorId });
  }

  render(): React.ReactNode {
    const { history } = this.props;
    const { editorId } = this.state;

    const title = 'Create Workspace';

    return (
      <React.Fragment>
        <Head pageName="Create Workspace" />

        <PageSection variant={PageSectionVariants.light}>
          <Title headingLevel={'h1'}>{title}</Title>
        </PageSection>

        <Divider />

        <PageSection variant={PageSectionVariants.default}>
          <EditorSelector
            selectedEditorId={editorId}
            onSelect={editorId => this.handleSelectEditor(editorId)}
          />

          <div className={styles.spacer}></div>

          <ImportFromGit selectedEditorId={editorId} history={history} />

          <div className={styles.spacer}></div>

          <SamplesList selectedEditorId={editorId} history={history} />
        </PageSection>
      </React.Fragment>
    );
  }
}

const mapStateToProps = (state: AppState) => ({
  defaultEditor: selectDefaultEditor(state),
});

const connector = connect(mapStateToProps);

type MappedProps = ConnectedProps<typeof connector>;
export default connector(GetStarted);
