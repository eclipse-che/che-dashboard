/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { HttpError } from "@kubernetes/client-node/dist/gen/api/apis";

/**
 * Wraps errors got from Kubernetes client and provides the most user-friendly error message it can.
 */
export class NodeRequestError extends Error {
  httpError: HttpError;
  message: string;

  constructor(prefix: string, error: HttpError) {
    super();
    this.httpError = error;
    let statusCode = error.statusCode;
    let response = error.response;
    if ((!statusCode || statusCode === -1)) {
      this.message = prefix + ': no response available due network issue.';
    } else if (error.body) {
      if (error.body.message) {
        // body is from K8s in JSON form with message present
        this.message = prefix + ': ' + error.body.message;
      } else {
        // pure http response body without message available
        this.message = prefix + ': ' + error.body;
      }
    } else {
      // try to evaluate status code from response if it's missing on the root level
      if (!statusCode && response && response.statusCode) {
        statusCode = response.statusCode;
      }
      this.message = `${prefix}: "${statusCode}" returned by "${error.response.url}"."`;
    }
  }
}
