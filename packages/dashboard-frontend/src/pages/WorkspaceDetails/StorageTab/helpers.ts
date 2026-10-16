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

import { helpers, WorkspaceStorageInfo } from '@eclipse-che/common';

const { formatGi, parseQuantity, GI } = helpers.quantity;

export const RESIZE_STEP_GI = 5;

/**
 * Formats bytes for display, e.g. `4.7 Gi`.
 */
export function formatGiB(bytes: number): string {
  return formatGi(bytes).replace(/Gi$/, ' Gi');
}

/**
 * Formats a Kubernetes quantity for display, e.g. `10Gi` → `10 Gi`.
 * Unparseable values are returned as is.
 */
export function formatQuantity(quantity: string | undefined): string {
  if (!quantity) {
    return '—';
  }
  try {
    return formatGiB(parseQuantity(quantity));
  } catch {
    return quantity;
  }
}

/**
 * Returns the value of a quantity in gibibytes, rounded to one decimal.
 */
export function toGi(quantity: string): number {
  return parseFloat((parseQuantity(quantity) / GI).toFixed(1));
}

/**
 * The current size of the volume: the largest of the requested size and the capacity,
 * as a pending resize makes the request larger than the capacity.
 */
export function getCurrentBytes(info: WorkspaceStorageInfo): number {
  const sizes = [info.requested, info.capacity].flatMap(quantity => {
    try {
      return quantity ? [parseQuantity(quantity)] : [];
    } catch {
      return [];
    }
  });
  return sizes.length > 0 ? Math.max(...sizes) : 0;
}

/**
 * The smallest size the volume can be resized to, in whole gibibytes.
 */
export function getMinResizeGi(info: WorkspaceStorageInfo): number {
  return Math.floor(getCurrentBytes(info) / GI) + 1;
}

/**
 * The size pre-filled in the resize modal, in whole gibibytes.
 */
export function getDefaultResizeGi(info: WorkspaceStorageInfo): number {
  return Math.floor(getCurrentBytes(info) / GI) + RESIZE_STEP_GI;
}

export function isResizePending(info: WorkspaceStorageInfo): boolean {
  if (info.resizing || info.fsResizePending) {
    return true;
  }
  try {
    return (
      info.requested !== undefined &&
      info.capacity !== undefined &&
      parseQuantity(info.requested) > parseQuantity(info.capacity)
    );
  } catch {
    return false;
  }
}
