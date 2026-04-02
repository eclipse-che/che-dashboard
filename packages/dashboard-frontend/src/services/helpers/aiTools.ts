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

import {
  V1alpha2DevWorkspaceSpecTemplateCommands,
  V1alpha2DevWorkspaceSpecTemplateComponents,
} from '@devfile/api';
import { api } from '@eclipse-che/common';

import devfileApi from '@/services/devfileApi';
import { Workspace } from '@/services/workspace-adapter';

type DevWorkspaceComponent = V1alpha2DevWorkspaceSpecTemplateComponents;
type DevWorkspaceCommand = V1alpha2DevWorkspaceSpecTemplateCommands;

/** Command IDs used for a given toolId */
export function toolCommandIds(toolId: string): { install: string; symlink: string; run: string } {
  return {
    install: `install-${toolId}`,
    symlink: `symlink-${toolId}`,
    run: `run-${toolId}`,
  };
}

/**
 * Returns the toolId of the AI tool injected into this workspace, or undefined.
 * Detects by matching the injectorImage prefix from any known tool in `allTools`.
 */
export function getInjectedAiToolId(
  workspace: Workspace,
  allTools: api.AiToolDefinition[],
): string | undefined {
  const components: Array<{ name?: string; container?: { image?: string } }> =
    (workspace.ref.spec?.template?.components as Array<{
      name?: string;
      container?: { image?: string };
    }>) ?? [];
  for (const comp of components) {
    const image: string = comp.container?.image ?? '';
    const tool = allTools.find(t => t.injectorImage === image);
    if (tool) {
      return tool.id;
    }
  }
  return undefined;
}

/**
 * Returns the display name of the injected AI tool, or undefined.
 */
export function getInjectedAiToolName(
  workspace: Workspace,
  allTools: api.AiToolDefinition[],
): string | undefined {
  const toolId = getInjectedAiToolId(workspace, allTools);
  return toolId ? allTools.find(t => t.id === toolId)?.name : undefined;
}

/**
 * Finds the name of the first user container (not an injector).
 */
function findEditorComponentName(
  components: Array<{ name?: string; container?: object; volume?: object }>,
): string | undefined {
  for (const c of components) {
    if (c.container && c.name && !c.name.endsWith('-injector')) {
      return c.name;
    }
  }
  return undefined;
}

/**
 * Builds the postStart command line that sets up PATH and (for bundle tools) a symlink.
 *
 * init pattern:   binary is already at /injected-tools/bin/<binary> — no symlink needed.
 * bundle pattern: binary is at /injected-tools/<toolId>/bin/<binary> — symlink into /injected-tools/bin/.
 */
function buildPostStartCommandLine(tool: api.AiToolDefinition): string {
  const { binary, pattern, id, setupCommand } = tool;

  const exportLine = 'export PATH="/injected-tools/bin:$PATH"';
  const pathSetup =
    `for rc in "$HOME/.bashrc" "$HOME/.profile"; do ` +
    `grep -q injected-tools "$rc" 2>/dev/null || echo '${exportLine}' >> "$rc" 2>/dev/null; ` +
    `done; true`;

  let mainCmd: string;
  if (pattern === 'init') {
    // Binary already at /injected-tools/bin/<binary>, just ensure PATH
    mainCmd = pathSetup;
  } else {
    // Symlink bundle binary (and bundled node if present) into /injected-tools/bin/
    const bundleDir = `/injected-tools/${id}/bin`;
    const symlinkTarget = `${bundleDir}/${binary}`;
    const nodeSymlink = `test -f ${bundleDir}/node && ln -sf ${bundleDir}/node /injected-tools/bin/node; true`;
    mainCmd = `mkdir -p /injected-tools/bin && ln -sf ${symlinkTarget} /injected-tools/bin/${binary} && ${nodeSymlink} && ${pathSetup}`;
  }

  return setupCommand ? `${setupCommand} && ${mainCmd}` : mainCmd;
}

/**
 * Returns a cloned DevWorkspace spec with the given AI tool injector added.
 *
 * preStart  → install-{toolId}  apply command  (copies binary via init container)
 * postStart → symlink-{toolId}  exec command   (creates /injected-tools/bin symlink + PATH)
 *
 * Accepts either a Workspace adapter or a raw DevWorkspace object.
 */
export function addAiToolToWorkspace(
  workspaceOrDevWorkspace: Workspace | devfileApi.DevWorkspace,
  toolId: string,
  allTools: api.AiToolDefinition[],
): devfileApi.DevWorkspace {
  const tool = allTools.find(t => t.id === toolId);
  if (!tool) {
    throw new Error(`Unknown AI tool: ${toolId}`);
  }

  const raw =
    'ref' in workspaceOrDevWorkspace ? workspaceOrDevWorkspace.ref : workspaceOrDevWorkspace;
  const cloned: devfileApi.DevWorkspace = JSON.parse(JSON.stringify(raw));
  const template = cloned.spec.template;
  template.components = template.components ?? [];
  template.commands = template.commands ?? [];

  const compName = `${toolId}-injector`;
  const { install: installCmdId, symlink: symlinkCmdId } = toolCommandIds(toolId);

  // Remove existing injector for this tool (idempotent)
  template.components = template.components.filter(c => c.name !== compName);

  // Ensure injected-tools volume exists
  if (!template.components.some(c => c.name === 'injected-tools')) {
    template.components.push({
      name: 'injected-tools',
      volume: { size: '256Mi' },
    } as unknown as DevWorkspaceComponent);
  }

  // Add injector component (init container)
  if (tool.pattern === 'init') {
    template.components.push({
      name: compName,
      container: {
        image: tool.injectorImage,
        command: ['/bin/sh'],
        args: [
          '-c',
          `mkdir -p /injected-tools/bin && cp /usr/local/bin/${tool.binary} /injected-tools/bin/${tool.binary}`,
        ],
        memoryLimit: '128Mi',
        mountSources: false,
        volumeMounts: [{ name: 'injected-tools', path: '/injected-tools' }],
      },
    } as unknown as DevWorkspaceComponent);
  } else {
    template.components.push({
      name: compName,
      container: {
        image: tool.injectorImage,
        command: ['/bin/sh'],
        args: ['-c', `cp -a /opt/${toolId}/. /injected-tools/${toolId}/`],
        memoryLimit: '256Mi',
        mountSources: false,
        volumeMounts: [{ name: 'injected-tools', path: '/injected-tools' }],
      },
    } as unknown as DevWorkspaceComponent);
  }

  const { run: runCmdId } = toolCommandIds(toolId);

  // Remove stale commands (idempotent)
  template.commands = template.commands.filter(
    (c: { id?: string }) => c.id !== installCmdId && c.id !== symlinkCmdId && c.id !== runCmdId,
  );

  // preStart: apply command runs the init container
  template.commands.push({
    id: installCmdId,
    apply: { component: compName },
  } as unknown as DevWorkspaceCommand);

  // postStart: exec command creates symlink and updates PATH
  const editorName = findEditorComponentName(
    template.components as Array<{ name?: string; container?: object; volume?: object }>,
  );

  // Ensure the editor/tooling container mounts the injected-tools volume and has PATH set
  if (editorName) {
    const editorComp = template.components.find(c => c.name === editorName) as
      | {
          name: string;
          container?: {
            volumeMounts?: Array<{ name: string; path: string }>;
            env?: Array<{ name: string; value: string }>;
          };
        }
      | undefined;
    if (editorComp?.container) {
      editorComp.container.volumeMounts = editorComp.container.volumeMounts ?? [];
      if (!editorComp.container.volumeMounts.some(vm => vm.name === 'injected-tools')) {
        editorComp.container.volumeMounts.push({ name: 'injected-tools', path: '/injected-tools' });
      }

      // Prepend /injected-tools/bin to PATH at the container env level
      editorComp.container.env = editorComp.container.env ?? [];
      const pathEntry = editorComp.container.env.find(e => e.name === 'PATH');
      if (pathEntry) {
        if (!pathEntry.value.includes('/injected-tools/bin')) {
          pathEntry.value = `/injected-tools/bin:${pathEntry.value}`;
        }
      } else {
        editorComp.container.env.push({
          name: 'PATH',
          value: '/injected-tools/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
        });
      }
    }
  }

  if (editorName) {
    template.commands.push({
      id: symlinkCmdId,
      exec: {
        component: editorName,
        commandLine: buildPostStartCommandLine(tool),
        workingDir: '${CHE_PROJECTS_ROOT}',
        label: `Set up ${tool.name}`,
      },
    } as unknown as DevWorkspaceCommand);

    // run: devfile exec command to start the AI tool (group: run)
    template.commands.push({
      id: runCmdId,
      exec: {
        component: editorName,
        commandLine: tool.runCommandLine,
        workingDir: '${PROJECT_SOURCE}',
        label: `[UD] run ${tool.name}`,
        group: {
          kind: 'run',
        },
      },
    } as unknown as DevWorkspaceCommand);
  }

  // Events
  if (!template.events) {
    template.events = {};
  }

  template.events.preStart = template.events.preStart ?? [];
  if (!template.events.preStart.includes(installCmdId)) {
    template.events.preStart.push(installCmdId);
  }

  if (editorName) {
    template.events.postStart = template.events.postStart ?? [];
    if (!template.events.postStart.includes(symlinkCmdId)) {
      template.events.postStart.push(symlinkCmdId);
    }
  }

  return cloned;
}

/**
 * Returns a cloned DevWorkspace spec with the given AI tool fully removed.
 *
 * Accepts either a Workspace adapter or a raw DevWorkspace object.
 */
export function removeAiToolFromWorkspace(
  workspaceOrDevWorkspace: Workspace | devfileApi.DevWorkspace,
  toolId: string,
): devfileApi.DevWorkspace {
  const raw =
    'ref' in workspaceOrDevWorkspace ? workspaceOrDevWorkspace.ref : workspaceOrDevWorkspace;
  const cloned: devfileApi.DevWorkspace = JSON.parse(JSON.stringify(raw));
  const template = cloned.spec.template;
  const compName = `${toolId}-injector`;
  const { install: installCmdId, symlink: symlinkCmdId, run: runCmdId } = toolCommandIds(toolId);

  if (template.components) {
    template.components = template.components.filter(c => c.name !== compName);
  }

  if (template.commands) {
    template.commands = template.commands.filter(
      (c: { id?: string }) => c.id !== installCmdId && c.id !== symlinkCmdId && c.id !== runCmdId,
    );
  }

  if (template.events?.preStart) {
    template.events.preStart = template.events.preStart.filter((e: string) => e !== installCmdId);
  }

  if (template.events?.postStart) {
    template.events.postStart = template.events.postStart.filter((e: string) => e !== symlinkCmdId);
  }

  return cloned;
}
