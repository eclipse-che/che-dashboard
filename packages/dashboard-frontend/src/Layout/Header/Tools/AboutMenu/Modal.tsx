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

import { AboutModal as PatternflyAboutModal, Content } from '@patternfly/react-core';
import { detect } from 'detect-browser';
import React from 'react';

import { CheLogo } from '@/components/CheLogo';

type Props = {
  productName: string | undefined;
  serverVersion: string | undefined;
  logo: string;
  isSvgLogo: boolean;
  isOpen: boolean;
  closeModal: () => void;
  username: string | undefined;
};

export class AboutModal extends React.PureComponent<Props> {
  private readonly browserVersion: string | undefined | null;
  private readonly browserOS: string | undefined | null;
  private readonly browserName: string | undefined;

  constructor(props: Props) {
    super(props);

    const browser = detect();
    this.browserVersion = browser?.version;
    this.browserOS = browser?.os;
    this.browserName = browser?.name;
  }

  private buildContent(): React.ReactElement {
    const dashboardVersion = process.env.DASHBOARD_VERSION;
    const serverVersion = this.props.serverVersion;
    const username = this.props.username;
    const browserVersion = this.browserVersion;
    const browserOS = this.browserOS;
    const browserName = this.browserName;

    return (
      <Content>
        <dl>
          {dashboardVersion && (
            <>
              <dt>Dashboard Version</dt>
              <dd className="co-select-to-copy" data-testid="dashboard-version">
                {dashboardVersion}
              </dd>
            </>
          )}
          {serverVersion && (
            <>
              <dt>Server Version</dt>
              <dd className="co-select-to-copy" data-testid="server-version">
                {serverVersion}
              </dd>
            </>
          )}
          {username && (
            <>
              <dt>Username</dt>
              <dd className="co-select-to-copy" data-testid="username">
                {username}
              </dd>
            </>
          )}
          {browserName && (
            <>
              <dt>Browser Name</dt>
              <dd className="co-select-to-copy" data-testid="browser-name">
                {browserName}
              </dd>
            </>
          )}
          {browserVersion && (
            <>
              <dt>Browser Version</dt>
              <dd className="co-select-to-copy" data-testid="browser-version">
                {browserVersion}
              </dd>
            </>
          )}
          {browserOS && (
            <>
              <dt>Browser OS</dt>
              <dd className="co-select-to-copy" data-testid="browser-os">
                {browserOS}
              </dd>
            </>
          )}
        </dl>
      </Content>
    );
  }

  public render(): React.ReactElement {
    const { isOpen, productName, logo, isSvgLogo } = this.props;

    const modalContent = this.buildContent();

    // For AboutModal, use img src even for SVG (PatternFly doesn't support custom children)
    // The CSS theme-aware styling only applies to inline SVG in the masthead
    return (
      <PatternflyAboutModal
        isOpen={isOpen}
        onClose={() => this.props.closeModal()}
        brandImageSrc={logo}
        brandImageAlt={`${productName} logo`}
      >
        {isSvgLogo && (
          <div style={{ position: 'absolute', top: '1rem', left: '1rem', width: '200px' }}>
            <CheLogo height="auto" width="100%" alt={`${productName} logo`} />
          </div>
        )}
        {modalContent}
      </PatternflyAboutModal>
    );
  }
}
