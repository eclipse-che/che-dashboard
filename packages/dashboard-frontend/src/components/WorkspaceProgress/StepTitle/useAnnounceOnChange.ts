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

import { useEffect, useRef } from 'react';

import { enqueueAnnouncement } from '@/components/WorkspaceProgress/StepTitle/announceQueue';

/**
 * Calls enqueueAnnouncement(format(value)) whenever `value` changes.
 * Skips the initial render so mounting does not trigger an announcement.
 */
export function useAnnounceOnChange<T>(value: T, format: (v: T) => string): void {
  const mountedRef = useRef(false);
  const formatRef = useRef(format);
  formatRef.current = format;

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    const text = formatRef.current(value);
    if (text) {
      enqueueAnnouncement(text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
}
