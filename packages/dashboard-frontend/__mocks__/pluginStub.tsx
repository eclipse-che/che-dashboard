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

// Stub for plugin modules that are only available via symlinks created by
// scripts/prepare-plugins.sh at build time. This file is used by jest's
// moduleNameMapper so tests that jest.mock() a plugin module can resolve it
// without the symlink being present.

import React from 'react';

export default function PluginStub(): React.ReactElement {
  return <></>;
}
