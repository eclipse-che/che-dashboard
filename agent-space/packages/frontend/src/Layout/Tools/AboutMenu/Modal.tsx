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

export type Props = {
  isOpen: boolean;
  closeModal: () => void;
  productName: string;
  serverVersion?: string;
  username: string;
  logo: string;
};

/** Mirrors the dashboard's background asset so the two dialogs look alike. */
const BACKGROUND_IMAGE_SRC = '/dashboard/assets/images/pf-background.svg';

function Entry({
  term,
  value,
  testId,
}: {
  term: string;
  value: string;
  testId: string;
}): React.ReactElement {
  return (
    <>
      <dt>{term}</dt>
      {/* `co-select-to-copy` is the OpenShift console class the dashboard uses
          to make a value selectable in one click. */}
      <dd className="co-select-to-copy" data-testid={testId}>
        {value}
      </dd>
    </>
  );
}

export function AboutModal({
  isOpen,
  closeModal,
  productName,
  serverVersion,
  username,
  logo,
}: Props): React.ReactElement {
  // The dashboard reports the same six values; Agent Space is part of the same
  // deployment, so an issue filed from either dialog carries the same facts.
  const browser = React.useMemo(() => detect(), []);
  const dashboardVersion = process.env.DASHBOARD_VERSION;

  return (
    <PatternflyAboutModal
      isOpen={isOpen}
      onClose={closeModal}
      brandImageSrc={logo}
      brandImageAlt={`${productName} logo`}
      backgroundImageSrc={BACKGROUND_IMAGE_SRC}
      productName={productName}
      data-testid="about-modal"
    >
      <Content>
        <dl>
          {dashboardVersion && (
            <Entry term="Dashboard Version" value={dashboardVersion} testId="dashboard-version" />
          )}
          {serverVersion && (
            <Entry term="Server Version" value={serverVersion} testId="server-version" />
          )}
          {username && <Entry term="Username" value={username} testId="username" />}
          {browser?.name && (
            <Entry term="Browser Name" value={browser.name} testId="browser-name" />
          )}
          {browser?.version && (
            <Entry term="Browser Version" value={browser.version} testId="browser-version" />
          )}
          {browser?.os && <Entry term="Browser OS" value={browser.os} testId="browser-os" />}
        </dl>
      </Content>
    </PatternflyAboutModal>
  );
}
