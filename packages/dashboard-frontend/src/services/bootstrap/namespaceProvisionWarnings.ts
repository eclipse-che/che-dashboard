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

import { container } from '@/inversify.config';
import { getKubernetesNamespace } from '@/services/backend-client/kubernetesNamespaceApi';
import { fetchUserProfile } from '@/services/backend-client/userProfileApi';
import { WarningsReporterService } from '@/services/bootstrap/warningsReporter';
import { AppState } from '@/store';
import { selectAdvancedAuthorization, selectAutoProvision } from '@/store/ServerConfig/selectors';

const warningsReporterService = container.get(WarningsReporterService);

export async function checkNamespaceProvisionWarnings(getState: () => AppState): Promise<void> {
  let username: string | undefined = undefined;
  const state = getState();
  const autoProvision = selectAutoProvision(state);
  if (autoProvision === false) {
    if (username === undefined) {
      username = await getUsername();
    }
    warningsReporterService.registerWarning(
      'autoProvisionWarning',
      `Automatic namespace provisioning is disabled. Namespace for ${username} might not have been configured yet. Please, contact the administrator.`,
    );
  }

  const advancedAuthorization = selectAdvancedAuthorization(state);
  if (advancedAuthorization === undefined || Object.keys(advancedAuthorization).length === 0) {
    return;
  }
  if (advancedAuthorization.allowGroups || advancedAuthorization.denyGroups) {
    if (username === undefined) {
      username = await getUsername();
    }
    warningsReporterService.registerWarning(
      'advancedAuthorizationGroupsWarning',
      `Advanced authorization is enabled. User ${username} might not be allowed. Please, contact the administrator.`,
    );
  }
  if (advancedAuthorization.allowUsers || advancedAuthorization.denyUsers) {
    if (username === undefined) {
      username = await getUsername();
    }
    warningsReporterService.registerWarning(
      'advancedAuthorizationUsersWarning',
      `Access for ${username} is forbidden. Please contact the administrator.`,
    );
  }
}

async function getUsername(): Promise<string> {
  let username = 'unknown';
  try {
    const namespaces = await getKubernetesNamespace();
    const targetNamespace =
      namespaces.find(namespace => namespace.attributes.default === 'true') || namespaces[0];
    if (targetNamespace !== undefined) {
      const userProfile = await fetchUserProfile(targetNamespace.name);
      username = userProfile.username;
    }
  } catch (e) {
    // noop
  }

  return username;
}
