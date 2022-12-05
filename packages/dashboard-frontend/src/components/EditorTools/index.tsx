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

import { Button, Divider, Flex, FlexItem } from '@patternfly/react-core';
import { CompressIcon, CopyIcon, DownloadIcon, ExpandIcon } from '@patternfly/react-icons';
import React from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';
import stringify from '../../services/helpers/editor';
import styles from './index.module.css';
import devfileApi from '../../services/devfileApi';

type Props = {
  content: che.Workspace | devfileApi.DevWorkspace | che.WorkspaceDevfile | devfileApi.Devfile;
  handleExpand: (isExpand: boolean) => void;
};

type State = {
  copied?: boolean;
  isExpanded: boolean;
  contentText: string;
  isDevWorkspace: boolean;
  contentBlobUrl: string;
};

class EditorTools extends React.PureComponent<Props, State> {
  private copiedTimer: number | undefined;

  constructor(props: Props) {
    super(props);

    this.state = {
      isExpanded: false,
      contentText: '',
      isDevWorkspace: false,
      contentBlobUrl: '',
    };
  }

  public componentDidMount(): void {
    const { content } = this.props;
    try {
      const contentText = stringify(content);
      const isDevWorkspace = this.isDevWorkspace(content);
      const contentBlobUrl = URL.createObjectURL(
        new Blob([contentText], { type: 'application/x-yaml' }),
      );
      this.setState({ contentText, isDevWorkspace, contentBlobUrl });
    } catch (e) {
      console.error(e);
    }
  }

  public componentDidUpdate(): void {
    const { content } = this.props;
    try {
      const contentText = stringify(content);
      if (contentText !== this.state.contentText) {
        const isDevWorkspace = this.isDevWorkspace(content);
        const contentBlobUrl = URL.createObjectURL(
          new Blob([contentText], { type: 'application/x-yaml' }),
        );
        this.setState({ contentText, isDevWorkspace, contentBlobUrl });
      }
    } catch (e) {
      console.error(e);
    }
  }

  private handleExpand(): void {
    if (this.state.isExpanded) {
      window.postMessage('show-navbar', '*');
      const isExpanded = false;
      this.setState({ isExpanded });
      this.props.handleExpand(isExpanded);
    } else {
      window.postMessage('hide-navbar', '*');
      const isExpanded = true;
      this.setState({ isExpanded });
      this.props.handleExpand(isExpanded);
    }
  }

  private isDevWorkspace(
    content: che.Workspace | devfileApi.DevWorkspace | che.WorkspaceDevfile | devfileApi.Devfile,
  ): boolean {
    if ((content as devfileApi.DevWorkspace)?.kind === 'DevWorkspace') {
      return true;
    }
    if ((content as che.Workspace)?.devfile) {
      return true;
    }
    return false;
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
    const { contentText, isDevWorkspace, contentBlobUrl, isExpanded, copied } = this.state;

    return (
      <div className={styles.editorTools}>
        <Flex>
          <FlexItem>
            <CopyToClipboard text={contentText} onCopy={() => this.onCopyToClipboard()}>
              <Button variant="link">
                <CopyIcon />
                {copied ? 'Copied' : 'Copy to clipboard'}
              </Button>
            </CopyToClipboard>
          </FlexItem>
          <Divider isVertical />
          <FlexItem>
            <a
              download={`${isDevWorkspace ? 'devworkspace' : 'devfile'}.yaml`}
              href={contentBlobUrl}
            >
              <DownloadIcon />
              Download
            </a>
          </FlexItem>
          <Divider isVertical />
          <FlexItem>
            <Button variant="link" onClick={() => this.handleExpand()}>
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

export default EditorTools;
