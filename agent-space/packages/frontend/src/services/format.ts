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

const PLACEHOLDER = '-';

export function formatTimestamp(timestamp: string | undefined): string {
  if (!timestamp) {
    return PLACEHOLDER;
  }
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? timestamp : date.toLocaleString();
}

/** Clock time of an event, as the dashboard shows it on its event cards. */
export function formatEventTime(timestamp: string | undefined): string {
  if (!timestamp) {
    return PLACEHOLDER;
  }
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? timestamp : date.toLocaleTimeString();
}

/** Newest first. Events without a timestamp keep the order they arrived in. */
export function compareEventTime(
  eventA: { lastTimestamp?: string; firstTimestamp?: string },
  eventB: { lastTimestamp?: string; firstTimestamp?: string },
): number {
  const timeA = eventA.lastTimestamp ?? eventA.firstTimestamp;
  const timeB = eventB.lastTimestamp ?? eventB.firstTimestamp;
  if (timeA === undefined || timeB === undefined) {
    return 0;
  }
  return new Date(timeB).getTime() - new Date(timeA).getTime();
}

const UNITS: { limit: number; divisor: number; label: string }[] = [
  { limit: 60, divisor: 1, label: 'second' },
  { limit: 3600, divisor: 60, label: 'minute' },
  { limit: 86400, divisor: 3600, label: 'hour' },
  { limit: Number.POSITIVE_INFINITY, divisor: 86400, label: 'day' },
];

/**
 * Coarse "3 hours ago" used in the Age column. Precision beyond the largest
 * unit is not useful for a sandbox list and makes the column noisy.
 */
export function formatAge(timestamp: string | undefined, now = Date.now()): string {
  if (!timestamp) {
    return PLACEHOLDER;
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return PLACEHOLDER;
  }

  const seconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));
  if (seconds < 10) {
    return 'just now';
  }

  const unit = UNITS.find(candidate => seconds < candidate.limit) ?? UNITS[UNITS.length - 1];
  const value = Math.floor(seconds / unit.divisor);
  return `${value} ${unit.label}${value === 1 ? '' : 's'} ago`;
}
