/*
 * Copyright (c) 2018-2023 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { formatDate, formatRelativeDate, getFormattedDate } from '@/services/helpers/dates';

describe('formatDate', () => {
  it('should return date in format "MMM dd, h:mm aaaa"', () => {
    const date = new Date('2000-11-01T00:00:00.000Z');
    const result = formatDate(date);
    expect(result).toEqual('Nov 01, 2:00 a.m.');
  });
});

describe('formatRelativeDate', () => {
  it('should return relative date (5 seconds ago)', () => {
    const date = new Date(Date.now() - 5_000);
    const result = formatRelativeDate(date);
    expect(result).toEqual('less than a minute ago');
  });

  it('should return relative date (5 minutes ago)', () => {
    const date = new Date(Date.now() - 300_000);
    const result = formatRelativeDate(date);
    expect(result).toEqual('5 minutes ago');
  });

  it('should return relative date (2 hours ago)', () => {
    const date = new Date(Date.now() - 7_200_000);
    const result = formatRelativeDate(date);
    expect(result).toEqual('about 2 hours ago');
  });
});

describe('getFormattedDate', () => {
  it('should return relative date (5 seconds ago)', () => {
    const date = new Date(Date.now() - 5_000);
    const result = getFormattedDate(date);
    expect(result).toEqual('less than a minute ago');
  });

  it('should return non-relative date', () => {
    const date = new Date('2000-11-01T00:00:00.000Z');
    const result = getFormattedDate(date);
    expect(result).toEqual('Nov 01, 2:00 a.m.');
  });
});
