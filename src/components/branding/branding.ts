/*
 * Copyright (c) 2015-2018 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */
'use strict';

export type IBranding = {
  title: string,
  name: string,
  productVersion?: string;
  logoFile: string,
  logoTextFile: string,
  favicon: string,
  loader: string,
  websocketContext: string,
  helpPath: string,
  helpTitle: string,
  supportEmail: string,
  oauthDocs: string,
  cli: {
    configName: string;
    name: string;
  },
  docs: IBrandingDocs,
  workspace: IBrandingWorkspace,
  footer: IBrandingFooter,
  configuration: IBrandingConfiguration,
}

export type IBrandingDocs = {
  devfile: string,
  workspace: string,
  factory: string,
  organization: string,
  general: string,
  converting: string,
  certificate: string,
  faq?: string,
  storageTypes: string,
  webSocketTroubleshooting: string,
}

export type IBrandingWorkspace = {
  priorityStacks: Array<string>,
  defaultStack: string
}

export type IBrandingFooter = {
  content: string,
  links: Array<{ title: string, location: string }>,
  email: { title: string, address: string, subject: string } | null
}

export type IBrandingConfiguration = {
  menu: {
    disabled: che.ConfigurableMenuItem[];
    enabled?: che.ConfigurableMenuItem[];
  },
  prefetch: {
    cheCDN?: string;
    resources: string[];
  },
  features: {
    disabled: TogglableFeature[];
  }
}

export enum TogglableFeature {
  WORKSPACE_SHARING = 'workspaceSharing',
  KUBERNETES_NAMESPACE_SELECTOR = 'kubernetesNamespaceSelector',
}
