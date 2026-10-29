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

import React from 'react';

import { ApplicationInfo, fetchApplications, fetchUsername } from '@/services/dashboard';

export interface HeaderToolsState {
  applications: ApplicationInfo[];
  username: string;
}

/**
 * Reads what the masthead controls need from the dashboard's API.
 *
 * Both readers answer with an empty value when the cluster does not expose
 * them, which the masthead takes as "do not render that control".
 */
export function useHeaderTools(): HeaderToolsState {
  const [state, setState] = React.useState<HeaderToolsState>({ applications: [], username: '' });

  React.useEffect(() => {
    let active = true;

    const resolve = async () => {
      const [applications, username] = await Promise.all([fetchApplications(), fetchUsername()]);
      if (active) {
        setState({ applications, username });
      }
    };

    resolve();

    return () => {
      active = false;
    };
  }, []);

  return state;
}
