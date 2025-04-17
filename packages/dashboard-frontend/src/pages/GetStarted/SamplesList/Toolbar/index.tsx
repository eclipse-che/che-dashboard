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
import React from 'react';
import Pluralize from 'react-pluralize';
import { connect, ConnectedProps } from 'react-redux';

import TemporaryStorageSwitch from '@/pages/GetStarted/SamplesList/Toolbar/TemporaryStorageSwitch';
import { RootState } from '@/store';
import { devfileRegistriesActionCreators } from '@/store/DevfileRegistries';
import { selectFilterValue, selectMetadataFiltered } from '@/store/DevfileRegistries/selectors';

export type Props = MappedProps & {
  isTemporary: boolean;
  onTemporaryStorageChange: (isTemporary: boolean) => void;
  presetFilter: string | undefined;
};

class SamplesListToolbar extends React.PureComponent<Props> {
  componentDidMount() {
    const searchValue = this.props.presetFilter;
    if (searchValue) {
      this.props.setFilter(searchValue);
    }
  }

  componentDidUpdate(prevProps: Readonly<Props>) {
    const { presetFilter } = this.props;
    if (presetFilter && presetFilter !== prevProps.presetFilter) {
      this.props.setFilter(presetFilter);
    }
  }

  componentWillUnmount(): void {
    this.props.clearFilter();
  }

  private handleTextInputChange(searchValue: string): void {
    this.props.setFilter(searchValue);
  }

  private buildCount(foundCount: number, searchValue: string): React.ReactElement {
    return searchValue === '' ? (
      <></>
    ) : (
      <Pluralize singular={'item'} count={foundCount} zero={'Nothing found'} />
    );
  }

  render(): React.ReactElement {
    const { filterValue, isTemporary, metadataFiltered } = this.props;

    const foundCount = metadataFiltered.length;

    return (
      <Flex>
        <FlexItem>
          <TextInput
            value={filterValue}
            type="search"
            onChange={value => this.handleTextInputChange(value)}
            aria-label="Filter samples list"
            placeholder="Filter by"
          />
        </FlexItem>
        <FlexItem>
          <TextContent>
            <Text>{this.buildCount(foundCount, filterValue)}</Text>
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
});

const connector = connect(mapStateToProps, devfileRegistriesActionCreators);

type MappedProps = ConnectedProps<typeof connector>;
export default connector(SamplesListToolbar);
