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

import styles from '@/Layout/Header/Tools/AboutMenu/Modal.module.css';

type Props = {
  productName: string | undefined;
  serverVersion: string | undefined;
  logo: string;
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
      <Content className={styles.aboutModalContent}>
        <dl>
          {dashboardVersion && (
            <>
              <dt className={styles.dashboardVersionLabel}>Dashboard Version</dt>
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
    const { isOpen, productName, logo } = this.props;

    const modalContent = this.buildContent();

    return (
      <PatternflyAboutModal
        isOpen={isOpen}
        onClose={() => this.props.closeModal()}
        brandImageSrc={logo}
        brandImageAlt={`${productName} logo`}
        backgroundImageSrc="/dashboard/assets/images/pf-background.svg"
        productName={productName}
      >
        {modalContent}
      </PatternflyAboutModal>
    );
  }
}
