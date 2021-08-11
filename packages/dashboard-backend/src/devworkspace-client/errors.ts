/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { IncomingMessage } from 'http';

export interface IKubernetesIncomingMessage extends IncomingMessage {
  body: {
    message: string
    details: {
      name: string;
    }
  };
}

export class NodeRequestError extends Error {

  status: number | undefined;
  response: any;
  request: any;
  message: string;

  constructor(error: IKubernetesIncomingMessage) {
    super();
    this.status = error.statusCode;
    this.response = (error as any).response;
    this.request = (error as any).request;
    if ((this.status === -1 || !this.status) && (!this.response  || (this.response && !this.response.status))) {
      this.message = `network issues occurred while requesting "${error.url}".`;
    } else if (error.body) {
      this.message = error.body.message;
    } else {
      let status = this.status;
      if (!this.status && this.response && this.response.status) {
          status = this.response.status;
      } else if (!this.status && this.request && this.request.status) {
          status = this.request.status;
      }
      this.message = `"${status}" returned by "${error.url}"."`;
    }
  }
}
