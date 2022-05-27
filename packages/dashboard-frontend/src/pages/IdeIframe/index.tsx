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
import { delay } from '../../services/helpers/delay';
import { DisposableCollection } from '../../services/helpers/disposable';
import { getEnvironment, isDevEnvironment } from '../../services/helpers/environment';

import styles from './index.module.css';

export type Props = {
  ideUrl: string;
  isDevWorkspace: boolean;
  onOpenWorkspacesList: () => void;
  onWorkspaceRestartFromIframe: (workspaceId: string) => void;
};

export class IdeIframe extends React.Component<Props> {
  private readonly toDispose = new DisposableCollection();

  public componentWillUnmount(): void {
    this.toDispose.dispose();
  }

  public async componentDidMount(): Promise<void> {
    const { ideUrl, isDevWorkspace } = this.props;

    this.startListenIframeMessages();

    if (isDevWorkspace) {
      // open ide link in the current window
      window.location.replace(ideUrl);
    }

    await this.preOpenIdeCheck(ideUrl, isDevWorkspace);
  }

  /**
   * Workaround to being able to open IDE in iframe while serving dashboard locally
   * */
  private async preOpenIdeCheck(ideUrl: string, isDevWorkspace: boolean): Promise<void> {
    const env = getEnvironment();
    const isDev = isDevEnvironment(env);
    if (isDev && isDevWorkspace === false) {
      try {
        const windowRef = window.open(ideUrl);
        await delay(2000);
        windowRef?.close();
      } catch (e) {
        // noop
      }
    }
  }

  private startListenIframeMessages(): void {
    const listener = (event: MessageEvent) => this.handleIframeMessage(event);
    window.addEventListener('message', listener);
    this.toDispose.push({
      dispose: () => {
        window.removeEventListener('message', listener);
      },
    });
  }

  private handleIframeMessage(event: MessageEvent): void {
    if (typeof event.data !== 'string') {
      return;
    }
    if (event.data === 'show-workspaces') {
      this.props.onOpenWorkspacesList();
    } else if (event.data.startsWith('restart-workspace:')) {
      const workspaceId = event.data.split(':')[1];
      this.props.onWorkspaceRestartFromIframe(workspaceId);
    }
  }

  render(): React.ReactElement {
    const { ideUrl, isDevWorkspace } = this.props;
    const src = isDevWorkspace ? './static/loader.html' : ideUrl;

    return (
      <div className={styles.ideIframeWrapper}>
        <iframe
          id="ide-iframe"
          className={styles.ideIframe}
          src={src}
          allow="fullscreen *;clipboard-write *;clipboard-read *"
        />
      </div>
    );
  }
}
