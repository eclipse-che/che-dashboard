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

/**
 * This helper function does its best to get an error message from the provided object.
 * @param error An object that supposed to contain an error message, or the error message.
 * @returns Error message
 */
export function getMessage(error: unknown): string {
  if (!error) {
    return 'Unexpected error.';
  }

  if (isAxiosError(error) && isAxiosResponse(error.response)) {
    const response = error.response;
    if (response.data.message) {
      return response.data.message;
    } else {
      return `${response.status} ${response.statusText}.`;
    }
  }

  if (isErrorLike(error)) {
    return error.message;
  }

  console.error('Unexpected error:', error);
  return 'Unexpected error. Check DevTools console and network tabs for more information.'
}

export function isErrorLike(error: unknown): error is { message: string } {
  return error !== undefined
    && (error as Error).message !== undefined
    && typeof (error as Error).message === 'string';
}

export function isError(error: unknown): error is Error {
  return isErrorLike(error)
    && (error as Error).name !== undefined;
}

export function isAxiosResponse(response: unknown): response is AxiosResponse {
  return response !== undefined
    && (response as AxiosResponse).status !== undefined
    && (response as AxiosResponse).statusText !== undefined
    && (response as AxiosResponse).headers !== undefined
    && (response as AxiosResponse).config !== undefined
    && (response as AxiosResponse).data !== undefined;
}

export function isAxiosError(object: unknown): object is AxiosError {
  return object !== undefined
    && (object as AxiosError).isAxiosError === true;
}
