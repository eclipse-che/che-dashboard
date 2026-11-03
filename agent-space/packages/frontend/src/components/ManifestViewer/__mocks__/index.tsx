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

import { Props } from '@/components/ManifestViewer';

/**
 * CodeMirror measures itself on an animation frame and re-renders its content
 * when it does, which makes assertions on the real editor race the measure in
 * a page-level test. Tests that only care that the manifest reached the viewer
 * mock it out; the editor itself is covered by its own spec.
 */
export function ManifestViewer({ value, isExpanded }: Props): React.ReactElement {
  return (
    <div data-testid="sandbox-manifest">
      <span data-testid="manifest-viewer-is-expanded">{isExpanded.toString()}</span>
      <pre>{value}</pre>
    </div>
  );
}
