/*
 * Copyright (c) 2018-2023 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { api as commonApi } from '@eclipse-che/common';
import * as cheApi from '@eclipse-che/api';

export interface IGitOauth {
  name: commonApi.GitOauthProvider;
  endpointUrl: string;
  links?: cheApi.che.core.rest.Link[];
}
