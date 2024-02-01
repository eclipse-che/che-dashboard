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
  Badge,
  Brand,
  Card,
  CardActions,
  CardBody,
  CardHeader,
  CardHeaderMain,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import React from 'react';

import { PluginEditor, VISIBLE_TAGS } from '@/pages/GetStarted/SamplesList/Gallery';
import { DropdownEditors } from '@/pages/GetStarted/SamplesList/Gallery/Card/DropdownEditors';
import styles from '@/pages/GetStarted/SamplesList/Gallery/Card/index.module.css';
import { che } from '@/services/models';
import { convertIconToSrc } from '@/services/registry/devfiles';
import { DevfileRegistryMetadata } from '@/store/DevfileRegistries/selectors';

export type Props = {
  metadata: DevfileRegistryMetadata;
  editors: PluginEditor[];
  onClick: (editorId: string | undefined) => void;
};

export class SampleCard extends React.PureComponent<Props> {
  private getTags(): JSX.Element[] {
    const {
      metadata: { tags },
    } = this.props;

    const createTag = (text: string, key: number): React.ReactElement => {
      return (
        <Badge
          isRead
          style={{ whiteSpace: 'nowrap' }}
          key={`badge_${key}`}
          data-testid="card-badge"
        >
          {text.trim()}
        </Badge>
      );
    };

    return tags
      .filter(tag => VISIBLE_TAGS.indexOf(tag) !== -1)
      .map((item: string, index: number) => createTag(item, index));
  }

  private handleCardClick(editorId: string | undefined): void {
    this.props.onClick(editorId);
  }

  private buildIcon(metadata: che.DevfileMetaData): React.ReactElement {
    const props = {
      className: styles.sampleCardIcon,
      alt: metadata.displayName,
      'aria-label': metadata.displayName,
    };

    return metadata.icon ? (
      <Brand src={convertIconToSrc(metadata.icon)} {...props} data-testid="sample-card-icon" />
    ) : (
      <CubesIcon {...props} data-testid="default-card-icon" />
    );
  }

  render(): React.ReactElement {
    const { metadata, editors } = this.props;

    const tags = this.getTags();
    const devfileIcon = this.buildIcon(metadata);

    return (
      <Card
        isFlat
        isCompact
        isSelectable
        key={metadata.links.v2}
        onClick={() => this.handleCardClick(undefined)}
        className={'sample-card'}
        data-testid="sample-card"
      >
        <CardHeader
          toggleButtonProps={{
            id: 'toggle-button',
            'aria-label': 'toggle button',
            'aria-expanded': 'true',
          }}
          onClick={() => this.handleCardClick(undefined)}
        >
          <CardHeaderMain>{devfileIcon}</CardHeaderMain>
          <CardActions>
            {tags}
            <DropdownEditors
              onEditorSelect={editorId => this.handleCardClick(editorId)}
              editors={editors}
            />
          </CardActions>
        </CardHeader>
        <CardHeader>{metadata.displayName}</CardHeader>
        <CardBody>{metadata.description}</CardBody>
      </Card>
    );
  }
}
