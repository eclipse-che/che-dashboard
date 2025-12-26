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

import { V1alpha2DevWorkspaceTemplate } from '@devfile/api';
import {
  devworkspacetemplateGroup,
  devworkspacetemplateLatestVersion,
  devworkspacetemplatePlural,
} from '@devfile/api/constants/constants';
import { api } from '@eclipse-che/common';
import { KubeConfig } from '@kubernetes/client-node';

import { createError } from '@/devworkspaceClient/services/helpers/createError';
import {
  CustomObjectAPI,
  prepareCustomObjectAPI,
} from '@/devworkspaceClient/services/helpers/prepareCustomObjectAPI';
import { IDevWorkspaceTemplateApi } from '@/devworkspaceClient/types';

export type DevWorkspaceTemplateList = {
  items?: V1alpha2DevWorkspaceTemplate[];
  [key: string]: unknown;
};

const DEW_WORKSPACE_TEMPLATE_API_ERROR_LABEL = 'CUSTOM_OBJECTS_API_ERROR';

export class DevWorkspaceTemplateApiService implements IDevWorkspaceTemplateApi {
  private readonly customObjectAPI: CustomObjectAPI;

  constructor(kc: KubeConfig) {
    this.customObjectAPI = prepareCustomObjectAPI(kc);
  }

  async listInNamespace(namespace: string): Promise<V1alpha2DevWorkspaceTemplate[]> {
    try {
      const resp = await this.customObjectAPI.listNamespacedCustomObject({
        group: devworkspacetemplateGroup,
        version: devworkspacetemplateLatestVersion,
        namespace,
        plural: devworkspacetemplatePlural,
      });
      return (resp as DevWorkspaceTemplateList).items as V1alpha2DevWorkspaceTemplate[];
    } catch (e) {
      throw createError(
        e,
        DEW_WORKSPACE_TEMPLATE_API_ERROR_LABEL,
        'Unable to list devworkspace templates',
      );
    }
  }

  async getByName(namespace: string, name: string): Promise<V1alpha2DevWorkspaceTemplate> {
    try {
      const resp = await this.customObjectAPI.getNamespacedCustomObject({
        group: devworkspacetemplateGroup,
        version: devworkspacetemplateLatestVersion,
        namespace,
        plural: devworkspacetemplatePlural,
        name,
      });
      return resp as V1alpha2DevWorkspaceTemplate;
    } catch (e) {
      throw createError(
        e,
        DEW_WORKSPACE_TEMPLATE_API_ERROR_LABEL,
        `Unable to get devworkspace "${namespace}/${name}"`,
      );
    }
  }

  async create(
    devworkspaceTemplate: V1alpha2DevWorkspaceTemplate,
  ): Promise<V1alpha2DevWorkspaceTemplate> {
    const namespace = devworkspaceTemplate.metadata?.namespace;
    if (!namespace) {
      throw new Error('namespace is missing');
    }
    try {
      const resp = await this.customObjectAPI.createNamespacedCustomObject({
        group: devworkspacetemplateGroup,
        version: devworkspacetemplateLatestVersion,
        namespace,
        plural: devworkspacetemplatePlural,
        body: devworkspaceTemplate,
      });
      return resp as V1alpha2DevWorkspaceTemplate;
    } catch (e) {
      throw createError(
        e,
        DEW_WORKSPACE_TEMPLATE_API_ERROR_LABEL,
        'Unable to create DevWorkspaceTemplate',
      );
    }
  }

  /**
   * Patch a template
   */
  async patch(
    namespace: string,
    templateName: string,
    patches: api.IPatch[],
  ): Promise<V1alpha2DevWorkspaceTemplate> {
    try {
      const resp = await this.customObjectAPI.patchNamespacedCustomObject({
        group: devworkspacetemplateGroup,
        version: devworkspacetemplateLatestVersion,
        namespace,
        plural: devworkspacetemplatePlural,
        name: templateName,
        body: patches,
      });
      return resp as V1alpha2DevWorkspaceTemplate;
    } catch (e) {
      throw createError(e, DEW_WORKSPACE_TEMPLATE_API_ERROR_LABEL, 'Unable to patch template');
    }
  }

  async delete(namespace: string, name: string): Promise<void> {
    try {
      await this.customObjectAPI.deleteNamespacedCustomObject({
        group: devworkspacetemplateGroup,
        version: devworkspacetemplateLatestVersion,
        namespace,
        plural: devworkspacetemplatePlural,
        name,
      });
    } catch (e) {
      throw createError(
        e,
        DEW_WORKSPACE_TEMPLATE_API_ERROR_LABEL,
        'Unable to delete devworkspace template',
      );
    }
  }
}
