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

import { V1alpha2DevWorkspace, V1alpha2DevWorkspaceTemplate } from '@devfile/api';
import { Main as DevworkspaceGenerator } from '@eclipse-che/che-devworkspace-generator/lib/main';
import { api } from '@eclipse-che/common';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { baseApiPath } from '@/constants/config';
import { DEVWORKSPACE_CONTAINER_SCC_ATTR } from '@/constants/devWorkspaceAnnotations';
import { namespacedSchema, workspaceCreationSchema } from '@/constants/schemas';
import { restParams } from '@/models';
import { axiosInstance } from '@/routes/api/helpers/getCertificateAuthority';
import { getDevWorkspaceClient } from '@/routes/api/helpers/getDevWorkspaceClient';
import { getToken } from '@/routes/api/helpers/getToken';
import { getSchema } from '@/services/helpers';

const tags = ['Workspace Creation'];

/** --- AI injection helpers --- */

/**
 * Returns an array of JSON Patch operations that inject an AI tool's init container
 * and environment variables into a DevWorkspace's spec template.
 * Uses only @devfile/api and @eclipse-che/common types.
 */
function buildAiInjectionPatches(
  tool: api.AiToolDefinition,
): Array<{ op: string; path: string; value: unknown }> {
  const patches: Array<{ op: string; path: string; value: unknown }> = [];

  // Inject initContainer via the devworkspace spec template attributes
  const initContainerAttrPath =
    '/spec/template/attributes/controller.devfile.io~1ai-init-containers';
  patches.push({
    op: 'add',
    path: initContainerAttrPath,
    value: [
      {
        name: `ai-inject-${tool.binary}`,
        image: tool.injectorImage,
        command: ['/bin/sh', '-c', `cp -r /opt/ai-tools/${tool.binary} /ai-tools/`],
        volumeMounts: [{ name: 'ai-tools', mountPath: '/ai-tools' }],
      },
    ],
  });

  return patches;
}

/**
 * Resolves the list of AI tools that should be injected into the DevWorkspace,
 * based on the requested provider IDs and the registry.
 * Uses only @eclipse-che/common types.
 */
function resolveAiTools(
  requestedProviderIds: string[],
  registry: api.IAiRegistry,
): api.AiToolDefinition[] {
  if (!requestedProviderIds || requestedProviderIds.length === 0) {
    return [];
  }
  return registry.tools.filter(tool => requestedProviderIds.includes(tool.providerId));
}

/** --- SCC patch builder --- */

/**
 * Builds the JSON Patch array to set the SCC attribute on the DevWorkspace spec template.
 * Path targets '/spec/template/attributes/controller.devfile.io~1scc' as required.
 */
function buildSccPatches(scc: string): api.IPatch[] {
  const sccAttrKey = DEVWORKSPACE_CONTAINER_SCC_ATTR.replace(/\//g, '~1');
  return [
    {
      op: 'add',
      path: `/spec/template/attributes/${sccAttrKey}`,
      value: scc,
    },
  ];
}

export function registerWorkspaceCreationRoute(instance: FastifyInstance) {
  const generator = new DevworkspaceGenerator();

  instance.register(async server => {
    server.post(
      `${baseApiPath}/namespace/:namespace/workspace-creation`,
      getSchema({ tags, params: namespacedSchema, body: workspaceCreationSchema }),
      async function (request: FastifyRequest, reply: FastifyReply) {
        // --- AUTH ---
        const token = getToken(request);
        const { namespace } = request.params as restParams.INamespacedParams;
        const body = request.body as api.IWorkspaceCreationRequest;

        // --- Validate input: exactly one of devfileContent / devfileUrl must be provided ---
        const hasContent = !!body.devfileContent;
        const hasUrl = !!body.devfileUrl;

        if (!hasContent && !hasUrl) {
          return reply
            .code(400)
            .send({ message: 'Either devfileContent or devfileUrl must be provided' });
        }
        if (hasContent && hasUrl) {
          return reply
            .code(400)
            .send({ message: 'Provide either devfileContent or devfileUrl, not both' });
        }

        // --- GENERATE ---
        const context = await generator.generateDevfileContext(
          {
            devfileContent: body.devfileContent,
            devfileUrl: body.devfileUrl,
            editorPath: body.editorPath,
            editorContent: body.editorContent,
            projects: [],
          },
          axiosInstance,
        );

        const devWorkspace: V1alpha2DevWorkspace = context.devWorkspace;

        // --- APPLY_OVERRIDES ---
        // Ensure metadata exists
        if (!devWorkspace.metadata) {
          devWorkspace.metadata = {};
        }
        if (!devWorkspace.metadata.annotations) {
          devWorkspace.metadata.annotations = {};
        }
        devWorkspace.metadata.namespace = namespace;

        // Apply project name override if provided
        if (body.projectName && !devWorkspace.metadata.name) {
          devWorkspace.metadata.name = body.projectName;
        }

        // Apply editor image override if provided
        if (body.editorImage) {
          if (!devWorkspace.spec) {
            devWorkspace.spec = { started: false, template: {} };
          }
          if (!devWorkspace.spec.template) {
            devWorkspace.spec.template = {};
          }
          if (!devWorkspace.spec.template.attributes) {
            devWorkspace.spec.template.attributes = {};
          }
          devWorkspace.spec.template.attributes['controller.devfile.io/editor-image'] =
            body.editorImage;
        }

        // --- spec.started must always be set to false before create (ng-002) ---
        if (!devWorkspace.spec) {
          devWorkspace.spec = { started: false, template: {} };
        } else {
          devWorkspace.spec.started = false;
        }

        // --- AI injection (if aiProviders requested) ---
        if (body.aiProviders && body.aiProviders.length > 0) {
          const aiDwClient = getDevWorkspaceClient(token);
          try {
            const registry = await aiDwClient.aiRegistryApi.get();
            const toolsToInject = resolveAiTools(body.aiProviders, registry);
            if (toolsToInject.length > 0) {
              if (!devWorkspace.spec.template) {
                devWorkspace.spec.template = {};
              }
              if (!devWorkspace.spec.template.attributes) {
                devWorkspace.spec.template.attributes = {};
              }
              // Collect init containers from all tools before assigning, so that
              // multiple AI tools do not silently overwrite each other's containers.
              const allInitContainers: unknown[] = [];
              for (const tool of toolsToInject) {
                const aiPatches = buildAiInjectionPatches(tool);
                for (const patch of aiPatches) {
                  const containers = patch.value as unknown[];
                  allInitContainers.push(...containers);
                }
              }
              const attrKey = 'controller.devfile.io/ai-init-containers';
              devWorkspace.spec.template.attributes[attrKey] = allInitContainers;
            }
          } catch (err) {
            server.log.warn('Failed to resolve AI tools for injection: %s', err);
          }
        }

        // --- CREATE_DW ---
        const dwClient = getDevWorkspaceClient(token);
        const { headers, devWorkspace: createdDW } = await dwClient.devworkspaceApi.create(
          devWorkspace,
          namespace,
        );

        // --- CREATE_TEMPLATE ---
        // When context.devWorkspaceTemplates is empty, skip entirely (spec-edge-007)
        const templates: V1alpha2DevWorkspaceTemplate[] = context.devWorkspaceTemplates || [];
        if (templates.length > 0) {
          for (const template of templates) {
            if (!template.metadata) {
              template.metadata = {};
            }
            template.metadata.namespace = namespace;
            // No compensating rollback logic for orphaned templates (ng-003)
            await dwClient.devWorkspaceTemplateApi.create(template);
          }
        }

        // --- PATCH_SCC ---
        // Read server config to find the configured SCC; failure must only warn (adr-003-inv-001)
        try {
          const cheCustomResource = await dwClient.serverConfigApi.fetchCheCustomResource();
          const containerBuild = dwClient.serverConfigApi.getContainerBuild(cheCustomResource);
          const scc =
            containerBuild.containerBuildConfiguration?.openShiftSecurityContextConstraint;
          if (scc && createdDW.metadata && createdDW.metadata.name) {
            const sccPatches = buildSccPatches(scc);
            await dwClient.devworkspaceApi.patch(namespace, createdDW.metadata.name, sccPatches);
          }
        } catch (err) {
          // SCC patch failure must only warn, never rethrow (adr-003-inv-001)
          server.log.warn('Failed to patch SCC on DevWorkspace: %s', err);
        }

        // --- RESPOND ---
        // Response body must always be the V1alpha2DevWorkspace from CREATE_DW step (adr-003-inv-002)
        reply.headers(headers).send(createdDW);
      },
    );
  });
}
