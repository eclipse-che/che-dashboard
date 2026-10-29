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

export type ToggleBarsType = {
  /** Takes the masthead and the sidebar off the page. */
  hideAll(): void;
  /** Puts them back. */
  showAll(): void;
};

/**
 * Lets a page give its content the whole window, the way the dashboard's
 * expanded devfile editor does.
 *
 * The default does nothing: a page rendered outside the layout - in a test, or
 * on the bootstrap error screen - has no bars to hide.
 */
export const ToggleBarsContext = React.createContext<ToggleBarsType>({
  hideAll: () => undefined,
  showAll: () => undefined,
});

export function useToggleBars(): ToggleBarsType {
  return React.useContext(ToggleBarsContext);
}
