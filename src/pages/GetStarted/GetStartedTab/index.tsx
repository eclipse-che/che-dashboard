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
import { connect, ConnectedProps } from 'react-redux';
import {
  PageSection,
  PageSectionVariants,
} from '@patternfly/react-core';
import { AppState } from '../../../store';
import * as WorkspacesStore from '../../../store/Workspaces';
import CheProgress from '../../../components/Progress';
import { SamplesListHeader } from './SamplesListHeader';
import SamplesListToolbar from './SamplesListToolbar';
import SamplesListGallery from './SamplesListGallery';
import { selectIsLoading, selectSettings } from '../../../store/Workspaces/selectors';

// At runtime, Redux will merge together...
type Props = {
  onDevfile: (devfileContent: string, stackName: string) => Promise<void>;
}
  & MappedProps;
type State = {
  temporary: boolean;
};

export class SamplesListTab extends React.PureComponent<Props, State> {

  constructor(props: Props) {
    super(props);

    this.state = {
      temporary: false,
    };

  }

  private handleTemporaryStorageChange(temporary: boolean): void {
    this.setState({ temporary });
  }

  private handleSampleCardClick(devfileContent: string, stackName: string): Promise<void> {
    return this.props.onDevfile(devfileContent, stackName);
  }

  public render(): React.ReactElement {
    const isLoading = this.props.isLoading;
    const persistVolumesDefault = this.props.settings['che.workspace.persist_volumes.default'];

    return (
      <React.Fragment>
        <PageSection
          variant={PageSectionVariants.light}>
          <SamplesListHeader />
          <SamplesListToolbar
            persistVolumesDefault={persistVolumesDefault}
            onTemporaryStorageChange={temporary => this.handleTemporaryStorageChange(temporary)} />
        </PageSection>
        <CheProgress isLoading={isLoading} />
        <PageSection variant={PageSectionVariants.default} style={{ background: '#f0f0f0' }}>
          <SamplesListGallery onCardClick={(devfileContent, stackName) => this.handleSampleCardClick(devfileContent, stackName)} />
        </PageSection>
      </React.Fragment>
    );
  }
}

const mapStateToProps = (state: AppState) => ({
  isLoading: selectIsLoading(state),
  settings: selectSettings(state),
});

const connector = connect(
  mapStateToProps,
  WorkspacesStore.actionCreators
);
type MappedProps = ConnectedProps<typeof connector>;
export default connector(SamplesListTab);
