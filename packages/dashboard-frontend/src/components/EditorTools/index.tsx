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

import { helpers } from '@eclipse-che/common';
import { AlertVariant, Button, Divider, Flex, FlexItem } from '@patternfly/react-core';
import { CompressIcon, CopyIcon, DownloadIcon, ExpandIcon } from '@patternfly/react-icons';
import React from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';
import { connect, ConnectedProps } from 'react-redux';

import styles from '@/components/EditorTools/index.module.css';
import { ToggleBarsContext } from '@/contexts/ToggleBars';
import { lazyInject } from '@/inversify.config';
import { AppAlerts } from '@/services/alerts/appAlerts';
import { AlertItem } from '@/services/helpers/types';
import { RootState } from '@/store';
import { bannerAlertActionCreators } from '@/store/BannerAlert';
import { selectApplications } from '@/store/ClusterInfo/selectors';

export type Props = MappedProps & {
  contentText: string;
  workspaceName: string;
  handleExpand: (isExpand: boolean) => void;
};

type State = {
  copied?: boolean;
  isExpanded: boolean;
  contentText: string;
  contentBlobUrl: string;
};

class EditorTools extends React.PureComponent<Props, State> {
  static contextType = ToggleBarsContext;
  readonly context: React.ContextType<typeof ToggleBarsContext>;

  private copiedTimer: number | undefined;

  @lazyInject(AppAlerts)
  private readonly appAlerts: AppAlerts;

  constructor(props: Props) {
    super(props);

    this.state = {
      isExpanded: false,
      contentText: '',
      contentBlobUrl: '',
    };
  }

  public componentDidMount(): void {
    this.init();
  }

  public componentDidUpdate(): void {
    this.init();
  }

  private init() {
    const { contentText } = this.props;
    try {
      if (contentText !== this.state.contentText) {
        const contentBlobUrl = URL.createObjectURL(
          new Blob([contentText], { type: 'application/x-yaml' }),
        );
        this.setState({ contentText, contentBlobUrl });
      }
    } catch (e) {
      this.showAlert({
        key: 'editor-tools-create blob-url-fails',
        variant: AlertVariant.danger,
        title: helpers.errors.getMessage(e),
      });
    }
  }

  private showAlert(alert: AlertItem): void {
    this.appAlerts.showAlert(alert);
  }

  private handleExpand(): void {
    if (this.state.isExpanded) {
      this.context.showAll();
      const isExpanded = false;
      this.setState({ isExpanded });
      this.props.handleExpand(isExpanded);
    } else {
      this.context.hideAll();
      const isExpanded = true;
      this.setState({ isExpanded });
      this.props.handleExpand(isExpanded);
    }
  }

  private onCopyToClipboard(): void {
    this.setState({ copied: true });
    if (this.copiedTimer) {
      clearTimeout(this.copiedTimer);
    }
    this.copiedTimer = window.setTimeout(() => {
      this.setState({ copied: false });
    }, 3000);
  }

  public render(): React.ReactElement {
    const { workspaceName } = this.props;
    const { contentText, contentBlobUrl, isExpanded, copied } = this.state;

    return (
      <div className={styles.editorTools}>
        <Flex>
          <FlexItem>
            <CopyToClipboard text={contentText} onCopy={() => this.onCopyToClipboard()}>
              <Button variant="link" className={styles.button}>
                <CopyIcon />
                {copied ? 'Copied' : 'Copy to clipboard'}
              </Button>
            </CopyToClipboard>
          </FlexItem>
          <Divider orientation={{ default: 'vertical' }} />
          <FlexItem>
            <a
              className={styles.button}
              download={`${workspaceName}.devfile.yaml`}
              href={contentBlobUrl}
            >
              <DownloadIcon />
              Download
            </a>
          </FlexItem>
          <Divider orientation={{ default: 'vertical' }} />
          <FlexItem>
            <Button className={styles.button} variant="link" onClick={() => this.handleExpand()}>
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

const mapStateToProps = (state: RootState) => ({
  applications: selectApplications(state),
});

const connector = connect(mapStateToProps, bannerAlertActionCreators);

type MappedProps = ConnectedProps<typeof connector>;

export default connector(EditorTools);
