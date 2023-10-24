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

import helpers from './helpers';
import * as api from './dto/api';

export * from './dto/cluster-info';
export * from './dto/cluster-config';

export { helpers, api };

export const FACTORY_LINK_ATTR = 'factoryLink';
export const ERROR_CODE_ATTR = 'error_code';
export const KUBECONFIG_MOUNT_PATH = '/tmp/.kube';

const common = {
  helpers,
  api,
};
export default common;
