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

import { AxiosError, AxiosResponse } from 'axios';

// export function getErrorMessage(error: Error | AxiosResponse): string {
export function getErrorMessage(error: unknown): string {
  if (!error) {
    return '';
  }
  if (isError(error) && error.message) {
    return error.message;
  }
  if (isAxiosResponse(error)) {
    if (error.data.message && typeof error.data.message === 'string') {
      return error.data.message;
    } else {
      return JSON.stringify(error.data);
    }
  }
  return JSON.stringify(error);
}

export function isError(error: unknown): error is Error {
  return (error as Error).message !== undefined;
}

export function isAxiosResponse(response: unknown): response is AxiosResponse {
  return (response as AxiosResponse).status !== undefined
    && (response as AxiosResponse).data !== undefined;
}

export function isAxiosError(object: unknown): object is AxiosError {
  return (object as AxiosError).isAxiosError === true;
}
