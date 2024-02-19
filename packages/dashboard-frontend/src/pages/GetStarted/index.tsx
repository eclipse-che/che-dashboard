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

import EditorSelector from '@/components/EditorSelector';
import Head from '@/components/Head';
import { Spacer } from '@/components/Spacer';
import ImportFromGit from '@/pages/GetStarted/ImportFromGit';
import SamplesList from '@/pages/GetStarted/SamplesList';
import { AppState } from '@/store';
import { selectDefaultEditor } from '@/store/ServerConfig/selectors';

type Props = MappedProps & {
  history: History;
};
type State = {
  editorId: string;
  editorImage: string | undefined;
};

export class GetStarted extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      editorId: props.defaultEditor,
      editorImage: undefined,
    };
  }

  private handleSelectEditor(editorId: string | undefined, editorImage: string | undefined): void {
    this.setState({
      editorId: editorId || this.props.defaultEditor,
      editorImage,
    });
  }

  render(): React.ReactNode {
    const { history } = this.props;
    const { editorId, editorImage } = this.state;

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
            onSelect={(editorId, editorImage) => this.handleSelectEditor(editorId, editorImage)}
          />

          <Spacer />

          <ImportFromGit editorId={editorId} editorImage={editorImage} history={history} />

          <Spacer />

          <SamplesList editorId={editorId} editorImage={editorImage} history={history} />
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
