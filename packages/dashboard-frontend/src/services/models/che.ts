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

import { Architecture } from '@eclipse-che/common';

export interface CheApiLink {
  method?: string;
  rel?: string;
  produces?: string;
  href?: string;
  consumes?: string;
}

export interface CheDevfileV1Source {
  startPoint?: string;
  location?: string;
  tag?: string;
  commitId?: string;
  type?: string;
  branch?: string;
  sparseCheckoutDir?: string;
}

export interface CheDevfileV1Metadata {
  name?: string;
  generateName?: string;
}

export interface CheDevfileV1Project {
  clonePath?: string;
  name?: string;
  source?: CheDevfileV1Source;
}

export interface CheDevfileV1 {
  components?: unknown[];
  metadata?: CheDevfileV1Metadata;
  projects?: CheDevfileV1Project[];
  apiVersion?: string;
  name?: string;
  attributes?: { [key: string]: string };
  commands?: unknown[];
}

export interface CheFactory {
  devfile?: CheDevfileV1;
  v?: string;
  name?: string;
  links?: CheApiLink[];
  source?: string;
  id?: string;
}

export type WorkspaceStorageType = 'ephemeral' | 'per-workspace' | 'per-user' | '';

export interface Plugin {
  id: string;
  name: string;
  publisher: string;
  displayName?: string;
  type: string;
  version: string;
  description?: string;
  provider?: string;
  links: {
    devfile: string;
  };
  icon: string;
  iconMediatype?: string;
  tags?: string[];
  arch?: Architecture[];
}

export interface WorkspaceDevfileAttributes {
  [key: string]: string;
}

export interface DevfileMetaData {
  displayName: string;
  description?: string;
  language?: string;
  globalMemoryLimit?: string;
  registry?: string;
  icon: string | { base64data: string; mediatype: string };
  links: {
    v2?: string;
    devWorkspaces?: {
      [editorId: string]: string;
    };
    self?: string;
    [key: string]: any;
  };
  url?: string;
  tags: Array<string>;
}

export interface KubernetesNamespace {
  name: string;
  attributes: {
    default?: 'true' | 'false';
    displayName?: string;
    phase: string;
  };
}
