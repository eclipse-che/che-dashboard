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
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';

import SamplesListGallery from '@/pages/GetStarted/SamplesList/Gallery';
import SamplesListToolbar from '@/pages/GetStarted/SamplesList/Toolbar';
import {
  EDITOR_ATTR,
  EDITOR_IMAGE_ATTR,
  POLICIES_CREATE_ATTR,
} from '@/services/helpers/factoryFlow/buildFactoryParams';
import { che } from '@/services/models';
import { RootState } from '@/store';
import {
  DevfileRegistryMetadata,
  selectMetadataFiltered,
} from '@/store/DevfileRegistries/selectors';
import { selectDefaultEditor } from '@/store/Plugins/devWorkspacePlugins/selectors';
import { selectPvcStrategy } from '@/store/ServerConfig/selectors';

export type Props = {
  editorDefinition: string | undefined;
  editorImage: string | undefined;
  presetFilter: string | undefined;
} & MappedProps;

type State = {
  isTemporary: boolean;
  isCreateNewIfExist: boolean;
};

class SamplesList extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      isTemporary: this.props.preferredStorageType === 'ephemeral',
      isCreateNewIfExist: false,
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

    return preferredStorageType === 'ephemeral' ? 'per-workspace' : preferredStorageType;
  }

  private handleCreateNewIfExistChange(isCreateNewIfExist: boolean): void {
    this.setState({ isCreateNewIfExist });
  }

  private getPoliciesCreate(): string {
    const { isCreateNewIfExist } = this.state;

    return isCreateNewIfExist ? 'perclick' : 'peruser';
  }

  private async handleSampleCardClick(metadata: DevfileRegistryMetadata): Promise<void> {
    const { editorDefinition, editorImage } = this.props;

    const url = new URL(metadata.links.v2);

    const factoryUrlParams = new URLSearchParams(url.searchParams);

    const _editorDefinition = editorDefinition || this.props.defaultEditorId;

    if (_editorDefinition !== undefined) {
      factoryUrlParams.append(EDITOR_ATTR, _editorDefinition);

      const prebuiltDevWorkspace = metadata.links.devWorkspaces?.[_editorDefinition];
      if (prebuiltDevWorkspace !== undefined) {
        factoryUrlParams.append('devWorkspace', prebuiltDevWorkspace);
      }
    }

    if (editorImage !== undefined) {
      factoryUrlParams.append(EDITOR_IMAGE_ATTR, editorImage);
    }

    const policiesCreate = this.getPoliciesCreate();
    // This is to avoid sending the default value in the URL('peruser' is the default value)
    if (policiesCreate !== 'peruser') {
      factoryUrlParams.set(POLICIES_CREATE_ATTR, policiesCreate);
    }

    const storageType = this.getStorageType();
    factoryUrlParams.append('storageType', storageType);

    url.search = factoryUrlParams.toString();
    const factoryLink = `${window.location.origin}#${url.toString()}`;

    window.open(factoryLink, '_blank');
  }

  public render(): React.ReactElement {
    const { metadataFiltered, presetFilter } = this.props;

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
              presetFilter={presetFilter}
              isTemporary={this.state.isTemporary}
              onTemporaryStorageChange={isTemporary =>
                this.handleTemporaryStorageChange(isTemporary)
              }
              onCreateNewIfExistChange={isCreateNewIfExist =>
                this.handleCreateNewIfExistChange(isCreateNewIfExist)
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

const mapStateToProps = (state: RootState) => ({
  metadataFiltered: selectMetadataFiltered(state),
  preferredStorageType: selectPvcStrategy(state),
  defaultEditorId: selectDefaultEditor(state),
});

const connector = connect(mapStateToProps);
type MappedProps = ConnectedProps<typeof connector>;
export default connector(SamplesList);
