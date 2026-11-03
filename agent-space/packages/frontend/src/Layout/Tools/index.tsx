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

import { ToolbarItem } from '@patternfly/react-core';
import React from 'react';

import { BrandingState } from '@/hooks/useBranding';
import { useHeaderTools } from '@/hooks/useHeaderTools';
import { AboutMenu } from '@/Layout/Tools/AboutMenu';
import { ApplicationsMenu } from '@/Layout/Tools/ApplicationsMenu';
import { UserMenu } from '@/Layout/Tools/UserMenu';

export type Props = {
  branding: BrandingState;
  /** The dashboard's User Preferences page, opened from the username menu. */
  userPreferencesUrl: string;
};

/**
 * The masthead controls the dashboard carries, so the two applications feel
 * like one: external applications, help and About, and the username menu.
 *
 * A control whose data the cluster does not expose is left out rather than
 * rendered empty.
 */
export function HeaderTools({ branding, userPreferencesUrl }: Props): React.ReactElement {
  const { applications, username } = useHeaderTools();

  return (
    <>
      {applications.length > 0 && <ApplicationsMenu applications={applications} />}
      <ToolbarItem>
        <AboutMenu
          links={branding.links}
          productName={branding.name}
          productVersion={branding.productVersion}
          username={username}
          logoSrc={branding.logoSrc}
        />
      </ToolbarItem>
      {username !== '' && (
        <ToolbarItem>
          <UserMenu username={username} userPreferencesUrl={userPreferencesUrl} />
        </ToolbarItem>
      )}
    </>
  );
}
