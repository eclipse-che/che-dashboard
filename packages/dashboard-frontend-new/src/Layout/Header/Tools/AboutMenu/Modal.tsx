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

import {
  AboutModal as PatternflyAboutModal,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from '@patternfly/react-core';
import { detect } from 'detect-browser';
import React from 'react';

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
      <Content>
        <DescriptionList>
          {dashboardVersion && (
            <DescriptionListGroup>
              <DescriptionListTerm>Dashboard Version</DescriptionListTerm>
              <DescriptionListDescription
                className="co-select-to-copy"
                data-testid="dashboard-version"
              >
                {dashboardVersion}
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {serverVersion && (
            <DescriptionListGroup>
              <DescriptionListTerm>Server Version</DescriptionListTerm>
              <DescriptionListDescription
                className="co-select-to-copy"
                data-testid="server-version"
              >
                {serverVersion}
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {username && (
            <DescriptionListGroup>
              <DescriptionListTerm>Username</DescriptionListTerm>
              <DescriptionListDescription className="co-select-to-copy" data-testid="username">
                {username}
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {browserName && (
            <DescriptionListGroup>
              <DescriptionListTerm>Browser Name</DescriptionListTerm>
              <DescriptionListDescription className="co-select-to-copy" data-testid="browser-name">
                {browserName}
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {browserVersion && (
            <DescriptionListGroup>
              <DescriptionListTerm>Browser Version</DescriptionListTerm>
              <DescriptionListDescription
                className="co-select-to-copy"
                data-testid="browser-version"
              >
                {browserVersion}
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {browserOS && (
            <DescriptionListGroup>
              <DescriptionListTerm>Browser OS</DescriptionListTerm>
              <DescriptionListDescription className="co-select-to-copy" data-testid="browser-os">
                {browserOS}
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
        </DescriptionList>
      </Content>
    );
  }

  public render(): React.ReactElement {
    const { isOpen, logo, productName } = this.props;

    const modalContent = this.buildContent();

    return (
      <PatternflyAboutModal
        isOpen={isOpen}
        onClose={() => this.props.closeModal()}
        brandImageSrc={logo}
        brandImageAlt={`${productName} logo`}
      >
        {modalContent}
      </PatternflyAboutModal>
    );
  }
}
