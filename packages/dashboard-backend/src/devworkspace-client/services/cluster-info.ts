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

import { ClusterInfo } from '@eclipse-che/common';

export async function getClusterInfo(): Promise<ClusterInfo> {
  const consoleUrl = process.env['OPENSHIFT_CONSOLE_URL'];
  const consoleTitle = process.env['OPENSHIFT_CONSOLE_TITLE'];
  const icon = 'https://console-openshift-console.apps.che-dev.x6e0.p1.openshiftapps.com/static/assets/redhat.svg';

  if (!consoleTitle) {
    throw new Error('Cannot detect the cluster web console title.');
  }
  if (!consoleUrl) {
    throw new Error(`Cannot detect the ${consoleTitle} URL.`);
  }

  return {
    clusterWebUI: {
      title: consoleTitle,
      url: consoleUrl,
      icon,
    },
  };
}
