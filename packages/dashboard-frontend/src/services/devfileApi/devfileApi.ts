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

export { Devfile, DevfileLike } from './devfile';
export { DevfileMetadata } from './devfile/metadata';
export { DevWorkspace, DevWorkspaceKind, DevWorkspaceLike } from './devWorkspace';
export { DevWorkspaceMetadata } from './devWorkspace/metadata';
export { DevWorkspaceSpec } from './devWorkspace/spec';
export { DevWorkspaceSpecTemplate } from './devWorkspace/spec/template';
export { DevWorkspaceTemplate, DevWorkspaceTemplateLike } from './devWorkspaceTemplate';
export { DevWorkspaceTemplateMetadata } from './devWorkspaceTemplate/metadata';

export declare class DevWorkspaceStatus {
  'conditions'?: Array<DevWorkspaceConditions>;
  'devworkspaceId': string;
  'mainUrl'?: string;
  'message'?: string;
  'phase'?: string;
  static readonly discriminator: string | undefined;
  static readonly attributeTypeMap: Array<{
    name: string;
    baseName: string;
    type: string;
    format: string;
  }>;
  static getAttributeTypeMap(): {
    name: string;
    baseName: string;
    type: string;
    format: string;
  }[];
  constructor();
}
export declare class DevWorkspaceConditions {
  'lastTransitionTime'?: Date;
  'message'?: string;
  'reason'?: string;
  'status': string;
  'type': string;
  static readonly discriminator: string | undefined;
  static readonly attributeTypeMap: Array<{
    name: string;
    baseName: string;
    type: string;
    format: string;
  }>;
  static getAttributeTypeMap(): {
    name: string;
    baseName: string;
    type: string;
    format: string;
  }[];
  constructor();
}
