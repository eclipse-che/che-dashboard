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

import * as React from 'react';
import {
  AboutModal as PatternflyAboutModal,
  TextContent,
  TextList,
  TextListItem,
} from '@patternfly/react-core';
import { detect } from 'detect-browser';

type AboutModalProps = {
  productName: string | undefined;
  serverVersion: string | undefined;
  logo: string;
  isOpen: boolean;
  closeAboutModal: () => void;
  username: string | undefined;
};

type AboutModalItemsProps = {
  username: string | undefined;
  serverVersion: string | undefined;
  browserVersion: string | null | undefined;
  browserOS: string | null | undefined;
  browserName: string | null | undefined;
};

const AboutModalItems: React.FC<AboutModalItemsProps> = (
  props: AboutModalItemsProps
) => {
  const dashboardVersion = process.env.DASHBOARD_VERSION;
  const serverVersion = props.serverVersion;
  const username = props.username;
  const browserVersion = props.browserVersion;
  const browserOS = props.browserOS;
  const browserName = props.browserName;
  return (
    <>
      <TextContent>
        <TextList component="dl">
          {dashboardVersion && (
            <>
              <TextListItem component="dt">Dashboard Version</TextListItem>
              <TextListItem
                component="dd"
                className="co-select-to-copy"
                data-testid="dashboard-version"
              >
                {dashboardVersion}
              </TextListItem>
            </>
          )}
          {serverVersion && (
            <>
              <TextListItem component="dt">Server Version</TextListItem>
              <TextListItem
                component="dd"
                className="co-select-to-copy"
                data-testid="server-version"
              >
                {serverVersion}
              </TextListItem>
            </>
          )}
          {username && (
            <>
              <TextListItem component="dt">Username</TextListItem>
              <TextListItem
                component="dd"
                className="co-select-to-copy"
                data-testid="username"
              >
                {username}
              </TextListItem>
            </>
          )}
          {browserName && (
            <>
              <TextListItem component="dt">Browser Name</TextListItem>
              <TextListItem
                component="dd"
                className="co-select-to-copy"
                data-testid="browser-name"
              >
                {browserName}
              </TextListItem>
            </>
          )}
          {browserVersion && (
            <>
              <TextListItem component="dt">Browser Version</TextListItem>
              <TextListItem
                component="dd"
                className="co-select-to-copy"
                data-testid="browser-version"
              >
                {browserVersion}
              </TextListItem>
            </>
          )}
          {browserOS && (
            <>
              <TextListItem component="dt">Browser OS</TextListItem>
              <TextListItem
                component="dd"
                className="co-select-to-copy"
                data-testid="browser-os"
              >
                {browserOS}
              </TextListItem>
            </>
          )}
        </TextList>
      </TextContent>
    </>
  );
};

export class AboutModal extends React.PureComponent<AboutModalProps> {
  public render(): React.ReactElement {
    const { isOpen, closeAboutModal } = this.props;
    const productName = this.props.productName;
    const logo = this.props.logo;
    const serverVersion = this.props.serverVersion;
    const userName = this.props.username;

    const browser = detect();
    const browserVersion = browser?.version;
    const browserOS = browser?.os;
    const browserName = browser?.name;

    return (
      <PatternflyAboutModal
        isOpen={isOpen}
        onClose={closeAboutModal}
        brandImageSrc={logo}
        brandImageAlt={`${productName} logo`}
        noAboutModalBoxContentContainer={true}
      >
        <AboutModalItems
          serverVersion={serverVersion}
          username={userName}
          browserOS={browserOS}
          browserVersion={browserVersion}
          browserName={browserName}
        />
      </PatternflyAboutModal>
    );
  }
}
