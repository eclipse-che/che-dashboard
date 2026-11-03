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

/**
 * Matches a value against a search string the way the dashboard workspace list
 * does: every token of the search has to begin a word of the value, in any
 * order, so "hello wor" finds "world-hello" as well as "hello-world".
 */
export default function match(value: string, tokens: string): boolean {
  return tokens
    .trim()
    .toLowerCase()
    .split(/\W+/)
    .every(token =>
      value
        .trim()
        .toLowerCase()
        .split(/\W+/)
        .some(word => word.startsWith(token)),
    );
}
