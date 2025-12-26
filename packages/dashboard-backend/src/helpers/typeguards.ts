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

import { V1Status } from '@kubernetes/client-node';
import { Response } from 'request';

/**
 * HttpError interface compatible with @kubernetes/client-node < 1.4
 * The HttpError class was removed in @kubernetes/client-node 1.4.0
 */
export interface HttpError {
  name: string;
  message: string;
  response: Response;
  body: V1Status;
}

/**
 * ApiException interface for @kubernetes/client-node >= 1.4
 * This is the new error format thrown by the kubernetes client
 */
export interface ApiException {
  code: number;
  message: string;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Typeguard for request.Response
 */
export function isResponse(response: unknown): response is Response {
  return (
    (response as Response).statusCode !== undefined &&
    (response as Response).statusMessage !== undefined
  );
}

/**
 * Typeguard for k8s.V1Status
 */
export function isV1Status(status: unknown): status is V1Status {
  return (status as V1Status).kind === 'Status';
}

/**
 * Typeguard for HttpError (legacy @kubernetes/client-node < 1.4)
 */
export function isHttpError(error: unknown): error is HttpError {
  return (
    (error as HttpError).name === 'HttpError' &&
    (error as HttpError).message !== undefined &&
    isResponse((error as HttpError).response) &&
    isV1Status((error as HttpError).body)
  );
}

/**
 * Typeguard for ApiException (@kubernetes/client-node >= 1.4)
 */
export function isApiException(error: unknown): error is ApiException {
  return (
    typeof (error as ApiException).code === 'number' &&
    typeof (error as ApiException).message === 'string'
  );
}

/**
 * Check if error is a 204 No Content response (not a real error)
 */
export function isNoContentResponse(error: unknown): boolean {
  if (isApiException(error)) {
    return error.code === 204;
  }
  if (isResponse(error)) {
    return error.statusCode === 204;
  }
  return false;
}
