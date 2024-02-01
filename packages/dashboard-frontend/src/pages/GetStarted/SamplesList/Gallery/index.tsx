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
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStatePrimary,
  EmptyStateVariant,
  Gallery,
  Title,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { SampleCard } from '@/pages/GetStarted/SamplesList/Gallery/Card';
import {
  filterMostPrioritized,
  sortByPriority,
} from '@/pages/GetStarted/SamplesList/Gallery/filterEditors';
import { che } from '@/services/models';
import { AppState } from '@/store';
import * as DevfileRegistriesStore from '@/store/DevfileRegistries';
import { DevfileRegistryMetadata, EMPTY_WORKSPACE_TAG } from '@/store/DevfileRegistries/selectors';
import { selectEditors } from '@/store/Plugins/chePlugins/selectors';
import { selectDefaultEditor } from '@/store/Plugins/devWorkspacePlugins/selectors';

export type PluginEditor = che.Plugin & {
  isDefault: boolean;
};

export const VISIBLE_TAGS = ['Community', 'Tech-Preview', 'Devfile.io'];

const EXCLUDED_TARGET_EDITOR_NAMES = ['dirigible', 'jupyter', 'eclipseide', 'code-server'];

export type Props = MappedProps & {
  metadataFiltered: DevfileRegistryMetadata[];
  onCardClick: (metadata: DevfileRegistryMetadata, editorId: string | undefined) => void;
};

export class SamplesListGallery extends React.PureComponent<Props> {
  private handleCardClick(metadata: DevfileRegistryMetadata, editorId: string | undefined): void {
    this.props.onCardClick(metadata, editorId);
  }

  private prepareEditors(): PluginEditor[] {
    const { editors, defaultEditor } = this.props;

    const allowed = editors
      .filter(editor => !EXCLUDED_TARGET_EDITOR_NAMES.includes(editor.name))
      .map(editor => ({
        ...editor,
        isDefault: defaultEditor === editor.id,
      }));

    const sorted = sortByPriority(allowed);
    const filtered = filterMostPrioritized(sorted);

    return filtered;
  }

  private prepareMetadata(): DevfileRegistryMetadata[] {
    function sortByVisibleTag(a: DevfileRegistryMetadata, b: DevfileRegistryMetadata): -1 | 0 | 1 {
      const getVisibleTag = (metadata: DevfileRegistryMetadata) =>
        metadata.tags.filter(tag => VISIBLE_TAGS.includes(tag))[0];
      const tagA = getVisibleTag(a);
      const tagB = getVisibleTag(b);
      if (tagA === tagB) {
        return 0;
      }
      if (tagA === undefined || tagA < tagB) {
        return -1;
      }
      if (tagB === undefined || tagA > tagB) {
        return 1;
      }
      return 0;
    }

    function sortByEmptyWorkspaceTag(
      a: DevfileRegistryMetadata,
      b: DevfileRegistryMetadata,
    ): -1 | 0 | 1 {
      if (a.tags.includes(EMPTY_WORKSPACE_TAG) > b.tags.includes(EMPTY_WORKSPACE_TAG)) {
        return -1;
      }
      if (a.tags.includes(EMPTY_WORKSPACE_TAG) < b.tags.includes(EMPTY_WORKSPACE_TAG)) {
        return 1;
      }
      return 0;
    }

    function sortByDisplayName(a: DevfileRegistryMetadata, b: DevfileRegistryMetadata): -1 | 0 | 1 {
      if (a.displayName < b.displayName) {
        return -1;
      }
      if (a.displayName > b.displayName) {
        return 1;
      }
      return 0;
    }

    return this.props.metadataFiltered
      .sort(sortByDisplayName)
      .sort(sortByVisibleTag)
      .sort(sortByEmptyWorkspaceTag);
  }

  private buildCardsList(): React.ReactElement[] {
    const pluginEditors = this.prepareEditors();
    const metadata = this.prepareMetadata();

    return metadata.map(meta => (
      <SampleCard
        key={meta.links.v2}
        metadata={meta}
        editors={pluginEditors}
        onClick={(editorId: string | undefined) => this.handleCardClick(meta, editorId)}
      />
    ));
  }

  render(): React.ReactElement {
    const cards = this.buildCardsList();

    if (cards.length === 0) {
      return (
        <EmptyState variant={EmptyStateVariant.full}>
          <EmptyStateIcon icon={SearchIcon} />
          <Title headingLevel="h1">No results found</Title>
          <EmptyStateBody>
            No results match the filter criteria. Clear filter to show results.
          </EmptyStateBody>
          <EmptyStatePrimary>
            <Button variant="link" onClick={(): void => this.props.clearFilter()}>
              Clear filter
            </Button>
          </EmptyStatePrimary>
        </EmptyState>
      );
    }

    return <Gallery hasGutter={true}>{cards}</Gallery>;
  }
}

const mapStateToProps = (state: AppState) => ({
  editors: selectEditors(state),
  defaultEditor: selectDefaultEditor(state),
});

const connector = connect(mapStateToProps, {
  ...DevfileRegistriesStore.actionCreators,
});

type MappedProps = ConnectedProps<typeof connector>;
export default connector(SamplesListGallery);
