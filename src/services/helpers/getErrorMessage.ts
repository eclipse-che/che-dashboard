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

import axios, { AxiosError } from 'axios';

export function getErrorMessage(error: Error | any): string {
  if (error.message) {
    return error.message;
  }
  if (axios.isAxiosError(error)) {
    return (error as AxiosError).response?.data;
  }
  return error.toString();
}
