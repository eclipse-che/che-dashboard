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
import { ROUTE } from '@/Routes';
import {
  DEV_WORKSPACE_ATTR,
  EDITOR_ATTR,
  EDITOR_IMAGE_ATTR,
  FACTORY_URL_ATTR,
  NAME_ATTR,
  POLICIES_CREATE_ATTR,
  STORAGE_TYPE_ATTR,
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
  customWorkspaceName: string;
};

class SamplesList extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      isTemporary: this.props.preferredStorageType === 'ephemeral',
      isCreateNewIfExist: false,
      customWorkspaceName: '',
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

  private handleWorkspaceNameChange(customWorkspaceName: string): void {
    this.setState({ customWorkspaceName });
  }

  private getPoliciesCreate(): string {
    const { isCreateNewIfExist } = this.state;

    return isCreateNewIfExist ? 'perclick' : 'peruser';
  }

  private async handleSampleCardClick(metadata: DevfileRegistryMetadata): Promise<void> {
    const { editorDefinition, editorImage } = this.props;
    const url = new URL(metadata.links.v2);
    const factoryParams: { [key: string]: string } = {
      [FACTORY_URL_ATTR]: `${url.origin}${url.pathname}${encodeURIComponent(url.search)}`,
    };

    const _editorDefinition = editorDefinition || this.props.defaultEditorId;
    if (_editorDefinition) {
      factoryParams[EDITOR_ATTR] = _editorDefinition;

      const prebuiltDevWorkspace = metadata.links.devWorkspaces?.[_editorDefinition];
      if (prebuiltDevWorkspace !== undefined) {
        factoryParams[DEV_WORKSPACE_ATTR] = prebuiltDevWorkspace;
      }
    }

    if (editorImage !== undefined) {
      factoryParams[EDITOR_IMAGE_ATTR] = editorImage;
    }

    const policiesCreate = this.getPoliciesCreate();
    // This is to avoid sending the default value in the URL('peruser' is the default value)
    if (policiesCreate !== 'peruser') {
      factoryParams[POLICIES_CREATE_ATTR] = policiesCreate;
    }

    factoryParams[STORAGE_TYPE_ATTR] = this.getStorageType();

    if (this.state.customWorkspaceName) {
      factoryParams[NAME_ATTR] = this.state.customWorkspaceName;
    }

    const factoryLink = `${window.location.origin}/dashboard/#${ROUTE.FACTORY_LOADER}?${new URLSearchParams(factoryParams).toString()}`;

    window.open(factoryLink, '_blank');
  }

  public render(): React.ReactElement {
    const { metadataFiltered, presetFilter } = this.props;
    const callbacks: { reset?: () => void } = {};

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
              onWorkspaceNameChange={customWorkspaceName =>
                this.handleWorkspaceNameChange(customWorkspaceName)
              }
              callbacks={callbacks}
            />
          </PanelMainBody>
          <PanelMainBody>
            <SamplesListGallery
              metadataFiltered={metadataFiltered}
              onCardClick={async metadata => {
                await this.handleSampleCardClick(metadata);
                callbacks.reset?.();
              }}
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
