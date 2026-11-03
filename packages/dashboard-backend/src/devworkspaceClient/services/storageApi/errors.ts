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

import { helpers } from '@eclipse-che/common';

export class StorageApiError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'STORAGE_API_ERROR';
    this.statusCode = statusCode;
  }
}

/**
 * Returns the HTTP status code of a Kubernetes client error, if any.
 */
export function getStatusCode(error: unknown): number | undefined {
  return helpers.errors.isKubeClientError(error) ? error.code : undefined;
}

export function isForbidden(error: unknown): boolean {
  return getStatusCode(error) === 403;
}
