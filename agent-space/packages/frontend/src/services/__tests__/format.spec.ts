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

import { compareEventTime, formatAge, formatEventTime, formatTimestamp } from '@/services/format';

describe('formatTimestamp', () => {
  it('renders a dash when there is no timestamp', () => {
    expect(formatTimestamp(undefined)).toBe('-');
    expect(formatTimestamp('')).toBe('-');
  });

  it('formats an ISO timestamp for the current locale', () => {
    const timestamp = '2025-06-01T10:30:00Z';

    expect(formatTimestamp(timestamp)).toBe(new Date(timestamp).toLocaleString());
  });

  it('shows an unparseable value as-is rather than NaN', () => {
    expect(formatTimestamp('not-a-date')).toBe('not-a-date');
  });
});

describe('formatEventTime', () => {
  it('renders a dash when there is no timestamp', () => {
    expect(formatEventTime(undefined)).toBe('-');
    expect(formatEventTime('')).toBe('-');
  });

  it('shows the clock time, not the date', () => {
    const timestamp = '2025-06-01T10:30:00Z';

    expect(formatEventTime(timestamp)).toBe(new Date(timestamp).toLocaleTimeString());
  });

  it('shows an unparseable value as-is rather than NaN', () => {
    expect(formatEventTime('not-a-date')).toBe('not-a-date');
  });
});

describe('compareEventTime', () => {
  const older = { lastTimestamp: '2025-06-01T10:00:00Z' };
  const newer = { lastTimestamp: '2025-06-01T11:00:00Z' };

  it('sorts the most recent event first', () => {
    expect([older, newer].sort(compareEventTime)).toEqual([newer, older]);
  });

  it('falls back to the first occurrence when there is no last one', () => {
    const firstOnly = { firstTimestamp: '2025-06-01T12:00:00Z' };

    expect([older, firstOnly].sort(compareEventTime)).toEqual([firstOnly, older]);
  });

  it('leaves an undated event where it was', () => {
    expect(compareEventTime({}, newer)).toBe(0);
    expect(compareEventTime(newer, {})).toBe(0);
  });
});

describe('formatAge', () => {
  const now = new Date('2025-06-01T12:00:00Z').getTime();

  function ago(seconds: number): string {
    return new Date(now - seconds * 1000).toISOString();
  }

  it.each([
    [5, 'just now'],
    [10, '10 seconds ago'],
    [59, '59 seconds ago'],
    [60, '1 minute ago'],
    [120, '2 minutes ago'],
    [3600, '1 hour ago'],
    [7200, '2 hours ago'],
    [86400, '1 day ago'],
    [86400 * 9, '9 days ago'],
  ])('renders %s seconds as "%s"', (seconds, expected) => {
    expect(formatAge(ago(seconds), now)).toBe(expected);
  });

  it('renders a dash when there is no timestamp', () => {
    expect(formatAge(undefined, now)).toBe('-');
  });

  it('renders a dash for an unparseable timestamp', () => {
    expect(formatAge('not-a-date', now)).toBe('-');
  });

  it('does not report a negative age for a clock skewed into the future', () => {
    expect(formatAge(new Date(now + 60_000).toISOString(), now)).toBe('just now');
  });
});
