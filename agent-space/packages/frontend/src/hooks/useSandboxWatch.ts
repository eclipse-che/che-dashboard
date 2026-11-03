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

import { useAppDispatch } from '@/store/hooks';
import { sandboxesActionCreators } from '@/store/Sandboxes';

/**
 * Keeps one namespace-wide sandbox subscription open for as long as the app is
 * mounted.
 *
 * It lives above the pages on purpose: the list and the details view read the
 * same stream, so neither has to request anything on its own, and switching
 * between them costs no traffic.
 *
 * @param isEnabled the namespace is only known once the bootstrap has finished
 */
export function useSandboxWatch(isEnabled: boolean): void {
  const dispatch = useAppDispatch();

  React.useEffect(() => {
    if (!isEnabled) {
      return;
    }

    void dispatch(sandboxesActionCreators.startWatchingSandboxes());

    return () => {
      dispatch(sandboxesActionCreators.stopWatchingSandboxes());
    };
  }, [dispatch, isEnabled]);
}
