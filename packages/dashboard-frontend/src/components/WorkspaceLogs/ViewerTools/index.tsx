/*
 * Copyright (c) 2018-2026 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { Button, Divider, Flex, FlexItem } from '@patternfly/react-core';
import { CompressIcon, DownloadIcon, ExpandIcon } from '@patternfly/react-icons';
import React from 'react';

import styles from '@/components/WorkspaceLogs/ViewerTools/index.module.css';
import { ToggleBarsContext } from '@/contexts/ToggleBars';

export type Props = {
  onToggle: (isExpand: boolean) => void;
  onDownload: () => void;
};

export type State = {
  isExpanded: boolean;
};

export class WorkspaceLogsViewerTools extends React.PureComponent<Props, State> {
  static contextType = ToggleBarsContext;
  readonly context: React.ContextType<typeof ToggleBarsContext>;

  constructor(props: Props) {
    super(props);

    this.state = {
      isExpanded: false,
    };
  }

  private handleToggle(): void {
    const isExpanded = !this.state.isExpanded;
    this.setState({ isExpanded });
    this.props.onToggle(isExpanded);

    if (this.state.isExpanded) {
      this.context.showAll();
    } else {
      this.context.hideAll();
    }
  }

  private handleDownload(): void {
    this.props.onDownload();
  }

  render(): React.ReactElement {
    const { isExpanded } = this.state;

    return (
      <div className={styles.viewerTools}>
        <Flex>
          <FlexItem>
            <Button variant="link" className={styles.button} onClick={() => this.handleDownload()}>
              <DownloadIcon />
              Download
            </Button>
          </FlexItem>
          <Divider orientation={{ default: 'vertical' }} />
          <FlexItem>
            <Button variant="link" className={styles.button} onClick={() => this.handleToggle()}>
              {isExpanded ? (
                <React.Fragment>
                  <CompressIcon />
                  Compress
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <ExpandIcon />
                  Expand
                </React.Fragment>
              )}
            </Button>
          </FlexItem>
        </Flex>
      </div>
    );
  }
}
