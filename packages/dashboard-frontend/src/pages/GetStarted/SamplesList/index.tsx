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
  Panel,
  PanelHeader,
  PanelMain,
  PanelMainBody,
  Text,
  TextContent,
  Title,
} from '@patternfly/react-core';
import { History } from 'history';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';

import SamplesListGallery from '@/pages/GetStarted/SamplesList/Gallery';
import SamplesListToolbar from '@/pages/GetStarted/SamplesList/Toolbar';
import { EDITOR_ATTR, EDITOR_IMAGE_ATTR } from '@/services/helpers/factoryFlow/buildFactoryParams';
import { buildFactoryLocation, toHref } from '@/services/helpers/location';
import { che } from '@/services/models';
import { AppState } from '@/store';
import {
  DevfileRegistryMetadata,
  selectMetadataFiltered,
} from '@/store/DevfileRegistries/selectors';
import { selectPvcStrategy } from '@/store/ServerConfig/selectors';

export type Props = {
  history: History;
  editorId: string;
  editorImage: string | undefined;
} & MappedProps;

type State = {
  isTemporary: boolean;
};

class SamplesList extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      isTemporary: this.props.preferredStorageType === 'ephemeral' ? true : false,
    };
  }

  private handleTemporaryStorageChange(isTemporary: boolean): void {
    this.setState({ isTemporary });
  }

  private getStorageType(): che.WorkspaceStorageType {
    const { preferredStorageType } = this.props;
    const { isTemporary } = this.state;

    if (isTemporary) {
      return 'ephemeral';
    }

    return preferredStorageType === 'ephemeral' ? 'persistent' : preferredStorageType;
  }

  private async handleSampleCardClick(metadata: DevfileRegistryMetadata): Promise<void> {
    const { editorId, editorImage } = this.props;

    const factoryUrlParams = new URLSearchParams({ url: metadata.links.v2 });

    factoryUrlParams.append(EDITOR_ATTR, editorId);
    if (editorImage) {
      factoryUrlParams.append(EDITOR_IMAGE_ATTR, editorImage);
    }

    const prebuiltDevWorkspace = metadata.links.devWorkspaces?.[editorId];
    if (prebuiltDevWorkspace !== undefined) {
      factoryUrlParams.append('devWorkspace', prebuiltDevWorkspace);
    }

    const storageType = this.getStorageType();
    factoryUrlParams.append('storageType', storageType);

    const factoryLocation = buildFactoryLocation();
    factoryLocation.search = factoryUrlParams.toString();

    const factoryLink = toHref(this.props.history, factoryLocation);
    window.open(factoryLink, '_blank');
  }

  public render(): React.ReactElement {
    const { metadataFiltered } = this.props;

    return (
      <Panel>
        <PanelHeader>
          <Title headingLevel="h3">Select a Sample</Title>
          <TextContent>
            <Text component="small">Select a sample to create your first workspace.</Text>
          </TextContent>
        </PanelHeader>
        <PanelMain>
          <PanelMainBody>
            <SamplesListToolbar
              isTemporary={this.state.isTemporary}
              onTemporaryStorageChange={isTemporary =>
                this.handleTemporaryStorageChange(isTemporary)
              }
            />
          </PanelMainBody>
          <PanelMainBody>
            <SamplesListGallery
              metadataFiltered={metadataFiltered}
              onCardClick={metadata => this.handleSampleCardClick(metadata)}
            />
          </PanelMainBody>
        </PanelMain>
      </Panel>
    );
  }
}

const mapStateToProps = (state: AppState) => ({
  metadataFiltered: selectMetadataFiltered(state),
  preferredStorageType: selectPvcStrategy(state),
});

const connector = connect(mapStateToProps);
type MappedProps = ConnectedProps<typeof connector>;
export default connector(SamplesList);
