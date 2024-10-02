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

import common from '@eclipse-che/common';
import { AxiosResponse } from 'axios';

export const CHE_EDITOR_YAML_PATH = '.che/che-editor.yaml';

/**
 * Returns an error message for the sanity check service
 */
export function getErrorMessage(error: unknown): string {
  let errorMessage = 'Check the browser logs message.';

  if (typeof error === 'object' && error !== null) {
    const { request, response } = error as { [propName: string]: any };
    const code = response?.status ? response?.status : response?.request?.status;
    const endpoint = request?.responseURL ? request?.responseURL : response?.request?.responseURL;

    if (!code || !endpoint) {
      return 'Unexpected error type. Please report a bug.';
    }

    const errorDetails = `HTTP Error code ${code}. Endpoint which throws an error ${endpoint}.`;
    console.error(errorDetails);

    if (common.helpers.errors.includesAxiosResponse(error) && error.response.data) {
      errorMessage = error.response.data;
    } else {
      errorMessage = `${errorDetails} ${errorMessage}`;
    }
  }

  if (isUnauthorized(error) || isForbidden(error)) {
    errorMessage += ' User session has expired. You need to re-login to the Dashboard.';
  }

  return errorMessage;
}

/**
 * Checks for login page in the axios response data
 */
export function hasLoginPage(error: unknown): boolean {
  if (common.helpers.errors.includesAxiosResponse(error)) {
    const response = error.response;
    if (typeof response.data === 'string') {
      try {
        const doc = new DOMParser().parseFromString(response.data, 'text/html');
        const docText = doc.documentElement.textContent;
        if (docText && docText.toLowerCase().indexOf('log in') !== -1) {
          return true;
        }
      } catch (e) {
        // no op
      }
    }
  }
  return false;
}

/**
 * Checks for HTTP 401 Unauthorized response status code
 */
export function isUnauthorized(error: unknown): boolean {
  return hasStatus(error, 401);
}

/**
 * Checks for HTTP 403 Forbidden
 */
export function isForbidden(error: unknown): boolean {
  return hasStatus(error, 403);
}

/**
 * Checks for HTTP 500 Internal Server Error
 */
export function isInternalServerError(error: unknown): boolean {
  return hasStatus(error, 500);
}

function hasStatus(error: unknown, _status: number): boolean {
  if (typeof error === 'string') {
    if (error.toLowerCase().includes(`http status ${_status}`)) {
      return true;
    }
  } else if (common.helpers.errors.isError(error)) {
    const str = error.message.toLowerCase();
    if (str.includes(`status code ${_status}`)) {
      return true;
    }
  } else if (typeof error === 'object' && error !== null) {
    const { status, statusCode, response } = error as {
      [propName: string]: string | number | unknown;
    };
    if (
      statusCode == _status ||
      status == _status ||
      (response && (response as AxiosResponse).status == _status)
    ) {
      return true;
    } else {
      try {
        const str = JSON.stringify(error).toLowerCase();
        if (str.includes(`http status ${_status}`)) {
          return true;
        } else if (str.includes(`status code ${_status}`)) {
          return true;
        }
      } catch (e) {
        // no-op
      }
    }
  }
  return false;
}
