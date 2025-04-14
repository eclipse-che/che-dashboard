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
  Divider,
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
import { che } from '@/services/models';
import { devfileRegistriesActionCreators } from '@/store/DevfileRegistries';
import { DevfileRegistryMetadata, EMPTY_WORKSPACE_TAG } from '@/store/DevfileRegistries/selectors';

export type PluginEditor = che.Plugin & {
  isDefault: boolean;
};

export const UNGROUPED_LANGUAGES_KEY = '...';
export const VISIBLE_TAGS = ['Community', 'Tech-Preview', 'Devfile.io', 'AirGap'];

export type Props = MappedProps & {
  metadataFiltered: DevfileRegistryMetadata[];
  onCardClick: (metadata: DevfileRegistryMetadata) => void;
};

export class SamplesListGallery extends React.PureComponent<Props> {
  private handleCardClick(metadata: DevfileRegistryMetadata): void {
    this.props.onCardClick(metadata);
  }

  private prepareMetadataMap(): Map<string, DevfileRegistryMetadata[]> {
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

    function getLanguage(metadata: DevfileRegistryMetadata): string {
      if (metadata.language) {
        return metadata.language;
      }
      const languages = [
        '.NET',
        'C++',
        'Go',
        'Java',
        'JavaScript',
        'NodeJS',
        'PHP',
        'Python',
        'Rust',
        'TypeScript',
      ];
      return languages.find(lang => metadata.tags.includes(lang)) || UNGROUPED_LANGUAGES_KEY;
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

    const metadataMap = new Map<string, DevfileRegistryMetadata[]>();
    this.props.metadataFiltered.forEach(meta => {
      const language = getLanguage(meta);
      if (!metadataMap[language]) {
        metadataMap[language] = [];
      }
      metadataMap[language].push(meta);
    });

    Object.keys(metadataMap).forEach(key => {
      const metadatas = metadataMap[key];
      if (metadatas.length > 2) {
        metadatas.sort(sortByDisplayName);
        metadatas.sort(sortByVisibleTag);
        metadatas.sort(sortByEmptyWorkspaceTag);
      } else if (key !== UNGROUPED_LANGUAGES_KEY) {
        if (!metadataMap[UNGROUPED_LANGUAGES_KEY]) {
          metadataMap[UNGROUPED_LANGUAGES_KEY] = [];
        }
        metadataMap[UNGROUPED_LANGUAGES_KEY].push(...metadatas);
        delete metadataMap[key];
      }
    });

    if (metadataMap[UNGROUPED_LANGUAGES_KEY]) {
      metadataMap[UNGROUPED_LANGUAGES_KEY].sort(sortByDisplayName)
        .sort(sortByVisibleTag)
        .sort(sortByEmptyWorkspaceTag);
    }

    return metadataMap;
  }

  private buildCardsList(): React.ReactElement[] {
    const metadataMap = this.prepareMetadataMap();

    const cardsList: React.ReactElement[] = [];

    Object.keys(metadataMap)
      .sort()
      .forEach(key => {
        const cards = metadataMap[key].map(meta => (
          <SampleCard
            key={meta.links.v2}
            metadata={meta}
            onClick={() => this.handleCardClick(meta)}
          />
        ));

        if (cardsList.length > 0) {
          cardsList.push(<Divider style={{ marginTop: '15px', marginBottom: '15px' }} />);
        }
        cardsList.push(
          <Gallery hasGutter={true} key={key}>
            {cards}
          </Gallery>,
        );
      });

    return cardsList;
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

    return <>{cards}</>;
  }
}

const connector = connect(null, devfileRegistriesActionCreators);

type MappedProps = ConnectedProps<typeof connector>;
export default connector(SamplesListGallery);
