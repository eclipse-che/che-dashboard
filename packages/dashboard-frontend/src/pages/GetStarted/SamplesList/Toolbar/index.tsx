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

import { Flex, FlexItem, Text, TextContent, TextInput } from '@patternfly/react-core';
import isEqual from 'lodash/isEqual';
import React from 'react';
import Pluralize from 'react-pluralize';
import { connect, ConnectedProps } from 'react-redux';

import { Selector } from '@/pages/GetStarted/SamplesList/Gallery/Selector';
import TemporaryStorageSwitch from '@/pages/GetStarted/SamplesList/Toolbar/TemporaryStorageSwitch';
import { RootState } from '@/store';
import {
  devfileRegistriesActionCreators,
  DevfileRegistryMetadata,
  selectRegistriesMetadata,
} from '@/store/DevfileRegistries';
import { selectFilterValue, selectMetadataFiltered } from '@/store/DevfileRegistries/selectors';

export type Props = MappedProps & {
  isTemporary: boolean;
  onTemporaryStorageChange: (isTemporary: boolean) => void;
  presetFilter: string | undefined;
};

export type State = {
  languages: string[];
  tags: string[];
};

class SamplesListToolbar extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    // Initialize state with tags and languages
    const { tags, languages } = this.getTagsAndLanguages(props.registriesMetadata);
    this.state = {
      tags,
      languages,
    };
  }

  private getTagsAndLanguages(registriesMetadata: DevfileRegistryMetadata[]): {
    languages: string[];
    tags: string[];
  } {
    const languages: string[] = [];
    const tags: string[] = [];

    registriesMetadata.forEach(metadata => {
      const language = metadata.language;
      if (language && !languages.includes(language)) {
        languages.push(language);
      }
      metadata.tags.forEach(tag => {
        if (!tags.includes(tag) && tag !== language) {
          tags.push(tag);
        }
      });
    });

    languages.sort();
    tags.sort();

    return { tags, languages };
  }

  componentDidMount() {
    const searchValue = this.props.presetFilter;
    if (searchValue) {
      this.props.setFilter(searchValue);
    }
  }

  componentDidUpdate(prevProps: Readonly<Props>) {
    const { presetFilter, registriesMetadata } = this.props;
    if (presetFilter && presetFilter !== prevProps.presetFilter) {
      this.props.setFilter(presetFilter);
    }
    if (!isEqual(registriesMetadata, prevProps.registriesMetadata)) {
      const { tags, languages } = this.getTagsAndLanguages(registriesMetadata);
      this.setState({ tags, languages });
    }
  }

  componentWillUnmount(): void {
    this.props.clearFilter();
  }

  private handleTextInputChange(searchValue: string): void {
    this.props.setFilter(searchValue);
  }

  private buildCount(
    foundCount: number,
    searchValue: string,
    allCount: number,
  ): React.ReactElement {
    return searchValue === '' && foundCount === allCount ? (
      <></>
    ) : (
      <Pluralize singular={'item'} count={foundCount} zero={'Nothing found'} />
    );
  }

  render(): React.ReactElement {
    const { filterValue, isTemporary, metadataFiltered, registriesMetadata } = this.props;
    const { tags, languages } = this.state;

    const foundCount = metadataFiltered.length;
    const allCount = registriesMetadata.length;

    return (
      <Flex>
        <FlexItem>
          <TextInput
            style={{ minWidth: '200px' }}
            value={filterValue}
            type="search"
            onChange={value => this.handleTextInputChange(value)}
            aria-label="Filter samples list"
            placeholder="Filter by"
          />
        </FlexItem>
        <FlexItem>
          <Selector
            list={tags}
            placeholderText={'Filter by tags'}
            onChange={tags => {
              this.props.setTagsFilter(tags);
            }}
          />
        </FlexItem>
        <FlexItem>
          <Selector
            list={languages}
            placeholderText={'Filter by languages'}
            onChange={languages => {
              this.props.setLanguagesFilter(languages);
            }}
          />
        </FlexItem>
        <FlexItem>
          <TextContent>
            <Text>{this.buildCount(foundCount, filterValue, allCount)}</Text>
          </TextContent>
        </FlexItem>
        <FlexItem align={{ default: 'alignRight' }}>
          <TemporaryStorageSwitch
            isTemporary={isTemporary}
            onChange={isTemporary => this.props.onTemporaryStorageChange(isTemporary)}
          />
        </FlexItem>
      </Flex>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  filterValue: selectFilterValue(state),
  metadataFiltered: selectMetadataFiltered(state),
  registriesMetadata: selectRegistriesMetadata(state),
});

const connector = connect(mapStateToProps, devfileRegistriesActionCreators);

type MappedProps = ConnectedProps<typeof connector>;
export default connector(SamplesListToolbar);
