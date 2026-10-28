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

import { WorkspaceStorageInfo } from '@eclipse-che/common';

import {
  formatGiB,
  formatQuantity,
  getCurrentBytes,
  getDefaultResizeGi,
  getMinResizeGi,
  isResizePending,
  toGi,
} from '@/pages/WorkspaceDetails/StorageTab/helpers';

const GI = 1024 ** 3;

function buildInfo(info: Partial<WorkspaceStorageInfo>): WorkspaceStorageInfo {
  return {
    strategy: 'per-user',
    shared: true,
    expandability: 'allowed',
    resizing: false,
    fsResizePending: false,
    ...info,
  };
}

describe('StorageTab helpers', () => {
  test('formatGiB', () => {
    expect(formatGiB(4.7 * GI)).toEqual('4.7\u00a0Gi');
  });

  test('formatQuantity', () => {
    expect(formatQuantity('10Gi')).toEqual('10\u00a0Gi');
    expect(formatQuantity('10240Mi')).toEqual('10\u00a0Gi');
    expect(formatQuantity(undefined)).toEqual('—');
    expect(formatQuantity('weird')).toEqual('weird');
  });

  test('toGi', () => {
    expect(toGi('25Gi')).toEqual(25);
    expect(toGi('512Mi')).toEqual(0.5);
  });

  test('current size is the largest of capacity and request', () => {
    expect(getCurrentBytes(buildInfo({ requested: '15Gi', capacity: '10Gi' }))).toEqual(15 * GI);
    expect(getCurrentBytes(buildInfo({ capacity: '10Gi' }))).toEqual(10 * GI);
    expect(getCurrentBytes(buildInfo({ capacity: 'bad' }))).toEqual(0);
  });

  test('min and default resize sizes', () => {
    const info = buildInfo({ requested: '10Gi', capacity: '10Gi' });
    expect(getMinResizeGi(info)).toEqual(11);
    expect(getDefaultResizeGi(info)).toEqual(15);

    const fractional = buildInfo({ capacity: '10.5Gi' });
    expect(getMinResizeGi(fractional)).toEqual(11);
  });

  test('isResizePending', () => {
    expect(isResizePending(buildInfo({ requested: '10Gi', capacity: '10Gi' }))).toBe(false);
    expect(isResizePending(buildInfo({ resizing: true }))).toBe(true);
    expect(isResizePending(buildInfo({ fsResizePending: true }))).toBe(true);
    expect(isResizePending(buildInfo({ requested: '15Gi', capacity: '10Gi' }))).toBe(true);
    expect(isResizePending(buildInfo({ requested: 'bad', capacity: '10Gi' }))).toBe(false);
  });
});
