/*
 * Copyright (c) 2018-2024 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { RootState } from '@/store';
import {
  selectAllEvents,
  selectEventsError,
  selectEventsFromResourceVersion,
  selectEventsResourceVersion,
} from '@/store/Events/selectors';

describe('Events Selectors', () => {
  const mockState = {
    events: {
      events: [
        { metadata: { name: 'event0' } },
        { metadata: { name: 'event1', resourceVersion: '123' } },
        { metadata: { name: 'event2', resourceVersion: '124' } },
        { metadata: { name: 'event3', resourceVersion: '125' } },
      ],
      error: 'Something went wrong',
      resourceVersion: '125',
    },
  } as RootState;

  it('should select all events', () => {
    const result = selectAllEvents(mockState);
    expect(result).toEqual(mockState.events.events);
  });

  it('should select events from a specific resource version', () => {
    const selectFromResourceVersion = selectEventsFromResourceVersion(mockState);
    const result = selectFromResourceVersion('124');
    expect(result).toEqual([
      { metadata: { name: 'event2', resourceVersion: '124' } },
      { metadata: { name: 'event3', resourceVersion: '125' } },
    ]);
  });

  it('should return an empty array if resource version is invalid', () => {
    const selectFromResourceVersion = selectEventsFromResourceVersion(mockState);
    const result = selectFromResourceVersion('invalid');
    expect(result).toEqual([]);
  });

  it('should select events error', () => {
    const result = selectEventsError(mockState);
    expect(result).toEqual(mockState.events.error);
  });

  it('should select events resource version', () => {
    const result = selectEventsResourceVersion(mockState);
    expect(result).toEqual(mockState.events.resourceVersion);
  });
});
