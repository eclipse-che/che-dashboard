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

import { existsSync, readFileSync } from 'fs';

import { isLocalRun } from '@/localRun';
import { logger } from '@/utils/logger';

export const SERVICE_ACCOUNT_TOKEN_PATH = '/run/secrets/kubernetes.io/serviceaccount/token';

export function getServiceAccountToken(): string {
  if (isLocalRun()) {
    // On OpenShift local run, CLUSTER_ACCESS_TOKEN holds the user's own OAuth token
    // (from `oc whoami -t`). Use it for Kubernetes API calls so workspace operations
    // run under the developer's identity, not the dashboard service account.
    const clusterAccessToken = process.env.CLUSTER_ACCESS_TOKEN;
    if (clusterAccessToken) {
      return clusterAccessToken;
    }
    return process.env.SERVICE_ACCOUNT_TOKEN as string;
  }
  if (!existsSync(SERVICE_ACCOUNT_TOKEN_PATH)) {
    logger.fatal('SERVICE_ACCOUNT_TOKEN is required');
    process.exit(1);
  }
  return readFileSync(SERVICE_ACCOUNT_TOKEN_PATH).toString();
}
