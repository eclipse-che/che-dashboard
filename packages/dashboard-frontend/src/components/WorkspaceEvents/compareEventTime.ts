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

import { CoreV1Event } from '@kubernetes/client-node';

/**
 * Compares two events by lastTimestamp.
 */
export default function compareEventTime(eventA: CoreV1Event, eventB: CoreV1Event): number {
  if (eventA.lastTimestamp === undefined || eventB.lastTimestamp === undefined) {
    return 0;
  }
  const aTime = new Date(eventA.lastTimestamp as unknown as string).getTime();
  const bTime = new Date(eventB.lastTimestamp as unknown as string).getTime();
  return bTime - aTime;
}
