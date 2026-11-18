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

import { Divider, PageSection, PageSectionVariants, Title } from '@patternfly/react-core';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { Location, NavigateFunction } from 'react-router-dom';

import AiSelector from '@/components/AiSelector';
import { AiSelectorErrorBoundary } from '@/components/AiSelector/ErrorBoundary';
import EditorSelector from '@/components/EditorSelector';
import Head from '@/components/Head';
import ImportFromGit from '@/components/ImportFromGit';
import { Spacer } from '@/components/Spacer';
import SamplesList from '@/pages/GetStarted/SamplesList';
import { ROUTE } from '@/Routes';
import { RootState } from '@/store';
import { selectAiConfigEnabled } from '@/store/AiConfig/selectors';
import { selectDefaultEditor } from '@/store/ServerConfig/selectors';

type Props = MappedProps & {
  location: Location;
  navigate: NavigateFunction;
};
type State = {
  editorDefinition: string | undefined;
  editorImage: string | undefined;
  customEditorName: string | undefined;
  aiProviders: string[];
  presetFilter: string | undefined;
};

export class GetStarted extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      editorDefinition: undefined,
      editorImage: undefined,
      customEditorName: undefined,
      aiProviders: [],
      presetFilter: this.getPresetFilter(),
    };
  }

  componentDidUpdate(prevProps: Readonly<Props>) {
    const { presetFilter } = this.state;
    const { location } = this.props;

    if (location !== prevProps.location) {
      const newPresetFilter = this.getPresetFilter();
      if (newPresetFilter !== presetFilter) {
        this.setState({ presetFilter: newPresetFilter });
      }
    }
  }

  private getPresetFilter(): string | undefined {
    const { pathname, search } = this.props.location;
    if (!search || pathname !== ROUTE.GET_STARTED) {
      return undefined;
    }
    const searchParam = new URLSearchParams(search);
    return searchParam.get('filter') || undefined;
  }

  private handleSelectEditor(
    editorDefinition: string | undefined,
    editorImage: string | undefined,
    customEditorName?: string,
  ): void {
    this.setState({
      editorDefinition,
      editorImage,
      customEditorName,
    });
  }

  render(): React.ReactNode {
    const { aiEnabled, defaultEditor, navigate } = this.props;
    const { editorDefinition, editorImage, customEditorName, aiProviders, presetFilter } =
      this.state;

    const title = 'Create Workspace';

    return (
      <React.Fragment>
        <Head pageName="Create Workspace" />

        <PageSection variant={PageSectionVariants.default}>
          <Title headingLevel={'h1'}>{title}</Title>
        </PageSection>

        <Divider />

        <PageSection variant={PageSectionVariants.default}>
          <EditorSelector
            defaultEditorId={defaultEditor}
            onSelect={(editorDefinition, editorImage, customEditorName) =>
              this.handleSelectEditor(editorDefinition, editorImage, customEditorName)
            }
          />

          {aiEnabled && (
            <React.Fragment>
              <Spacer />

              <AiSelectorErrorBoundary>
                <AiSelector onSelect={providerIds => this.setState({ aiProviders: providerIds })} />
              </AiSelectorErrorBoundary>
            </React.Fragment>
          )}

          <Spacer />

          <ImportFromGit
            editorDefinition={editorDefinition}
            editorImage={editorImage}
            customEditorName={customEditorName}
            aiProviders={aiProviders}
            navigate={navigate}
          />

          <Spacer />

          <SamplesList
            editorDefinition={editorDefinition}
            editorImage={editorImage}
            customEditorName={customEditorName}
            aiProviders={aiProviders}
            presetFilter={presetFilter}
          />
        </PageSection>
      </React.Fragment>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  aiEnabled: selectAiConfigEnabled(state),
  defaultEditor: selectDefaultEditor(state),
});

const connector = connect(mapStateToProps);

type MappedProps = ConnectedProps<typeof connector>;
export default connector(GetStarted);
