/*
 * Copyright (c) 2018-2021 Red Hat, Inc.
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
  Alert,
  AlertActionCloseButton,
  AlertGroup,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStatePrimary,
  EmptyStateVariant,
  Gallery,
  Title,
  AlertVariant,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { AppState } from '../../../store';
import * as DevfileRegistriesStore from '../../../store/DevfileRegistries';
import { SampleCard } from './SampleCard';
import { AlertItem } from '../../../services/helpers/types';
import { selectMetadataFiltered } from '../../../store/DevfileRegistries/selectors';

type Props =
  MappedProps
  & {
    onCardClick: (devfileContent: string, stackName: string) => void;
  };
type State = {
  alerts: AlertItem[];
};

export class SamplesListGallery extends React.PureComponent<Props, State> {

  constructor(props: Props) {
    super(props);

    this.state = {
      alerts: [],
    };
  }

  private removeAlert(key: string): void {
    this.setState({ alerts: [...this.state.alerts.filter(al => al.key !== key)] });
  }

  render(): React.ReactElement {
    const metadata = this.props.metadataFiltered;
    const cards = this.buildCardsList(metadata);

    if (cards.length) {
      return (
        <React.Fragment>
          <AlertGroup isToast>
            {this.state.alerts.map(({ title, variant, key }) => (
              <Alert
                variant={variant}
                title={title}
                key={key}
                actionClose={<AlertActionCloseButton onClose={() => this.removeAlert(key)} />}
              />
            ))}
          </AlertGroup>
          <Gallery hasGutter={true}>
            {cards}
          </Gallery>
        </React.Fragment>
      );
    }

    return this.buildEmptyState();
  }

  private async fetchDevfile(meta: che.DevfileMetaData): Promise<void> {
    try {
      const devfile = await this.props.requestDevfile(meta.links.self) as string;
      this.props.onCardClick(devfile, meta.displayName);
    } catch (e) {
      console.warn('Failed to load devfile.', e);

      const alerts = [...this.state.alerts, {
        key: meta.links.self,
        title: `Failed to load devfile "${meta.displayName}"`,
        variant: AlertVariant.warning,
      }];
      this.setState({ alerts });
    }
  }

  private buildCardsList(metadata: che.DevfileMetaData[] = []): React.ReactElement[] {
    return metadata.map(meta => (
      <SampleCard
        key={meta.links.self}
        metadata={meta}
        onClick={(): Promise<void> => this.fetchDevfile(meta)}
      />
    ));
  }

  private buildEmptyState(): React.ReactElement {
    return (
      <EmptyState variant={EmptyStateVariant.full}>
        <EmptyStateIcon icon={SearchIcon} />
        <Title headingLevel='h1'>
          No results found
          </Title>
        <EmptyStateBody>
          No results match the filter criteria. Clear filter to show results.
          </EmptyStateBody>
        <EmptyStatePrimary>
          <Button
            variant='link'
            onClick={(): void => this.props.clearFilter()}>
            Clear filter
            </Button>
        </EmptyStatePrimary>
      </EmptyState>
    );
  }

}

const mapStateToProps = (state: AppState) => ({
  metadataFiltered: selectMetadataFiltered(state),
});

const connector = connect(
  mapStateToProps,
  {
    ...DevfileRegistriesStore.actionCreators,
  }
);

type MappedProps = ConnectedProps<typeof connector>;
export default connector(SamplesListGallery);
