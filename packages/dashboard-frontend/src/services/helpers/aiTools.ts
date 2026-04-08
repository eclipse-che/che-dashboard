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

/** Attribute key used to mark dashboard-managed AI tool components and commands. */
export const ADMIN_MANAGEABLE_ATTRIBUTE = 'che.eclipse.org/admin-manageable';

/**
 * Strips the tag or digest suffix from a container image reference.
 * e.g. 'quay.io/example/claude-code:next' → 'quay.io/example/claude-code'
 *      'quay.io/example/claude-code@sha256:abc' → 'quay.io/example/claude-code'
 */
export function stripImageTag(image: string): string {
  // Remove digest first (@sha256:...), then tag (:...)
  const atIdx = image.indexOf('@');
  if (atIdx !== -1) {
    return image.substring(0, atIdx);
  }
  const colonIdx = image.lastIndexOf(':');
  // Avoid stripping port numbers (e.g. 'registry:5000/repo')
  if (colonIdx !== -1 && !image.substring(colonIdx).includes('/')) {
    return image.substring(0, colonIdx);
  }
  return image;
}

/**
 * Extracts a Kubernetes-compatible slug from the injector image name.
 * e.g. 'quay.io/example/claude-code:next' → 'claude-code'
 */
export function getToolSlug(tool: api.AiToolDefinition): string {
  const imagePath = tool.injectorImage.split(':')[0];
  const lastSegment = imagePath.split('/').pop();
  return lastSegment ?? tool.binary;
}

/** Command IDs used for a given tool slug */
export function toolCommandIds(slug: string): {
  install: string;
  symlink: string;
  run: string;
  cleanup: string;
} {
  return {
    install: `install-${slug}`,
    symlink: `symlink-${slug}`,
    run: `run-${slug}`,
    cleanup: `cleanup-${slug}`,
  };
}

/**
 * Returns all toolIds of AI tools injected into this workspace.
 * Detects by matching the injectorImage from any known tool in `allTools`.
 */
export function getInjectedAiToolIds(
  workspace: Workspace,
  allTools: api.AiToolDefinition[],
): string[] {
  const components: Array<{ name?: string; container?: { image?: string } }> =
    (workspace.ref.spec?.template?.components as Array<{
      name?: string;
      container?: { image?: string };
    }>) ?? [];
  const ids: string[] = [];
  for (const comp of components) {
    const image: string = comp.container?.image ?? '';
    const tool = allTools.find(t => stripImageTag(t.injectorImage) === stripImageTag(image));
    if (tool && !ids.includes(tool.providerId)) {
      ids.push(tool.providerId);
    }
  }
  return ids;
}

/**
 * Returns the display names of all injected AI tools.
 */
export function getInjectedAiToolNames(
  workspace: Workspace,
  allTools: api.AiToolDefinition[],
): string[] {
  const toolIds = getInjectedAiToolIds(workspace, allTools);
  return toolIds
    .map(id => allTools.find(t => t.providerId === id)?.name)
    .filter((name): name is string => name !== undefined);
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
  const { binary, pattern, setupCommand } = tool;
  const slug = getToolSlug(tool);

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
    const bundleDir = `/injected-tools/${slug}/bin`;
    const symlinkTarget = `${bundleDir}/${binary}`;
    const nodeSymlink = `test -f ${bundleDir}/node && ln -sf ${bundleDir}/node /injected-tools/bin/node; true`;
    mainCmd = `mkdir -p /injected-tools/bin && ln -sf ${symlinkTarget} /injected-tools/bin/${binary} && ${nodeSymlink} && ${pathSetup}`;
  }

  // SECURITY NOTE: setupCommand is sourced from an admin-managed ConfigMap.
  // If this ever accepts user input, it must be sanitized to prevent command injection.
  // setupCommand is best-effort (e.g. creating config dirs); it must not block
  // the critical symlink/PATH setup even if it fails (e.g. read-only $HOME).
  return setupCommand ? `{ ${setupCommand}; } 2>/dev/null; ${mainCmd}` : mainCmd;
}

/**
 * Builds the cleanup command line that removes stale binaries from the shared volume
 * when a tool is removed from the workspace. Runs in the background (nohup ... &)
 * so it never blocks or freezes workspace startup. If a removal fails, the command
 * is idempotent and will retry on the next start.
 */
function buildCleanupCommandLine(tool: api.AiToolDefinition): string {
  const { binary, pattern } = tool;
  const slug = getToolSlug(tool);

  const parts: string[] = [];
  parts.push(`rm -f /injected-tools/bin/${binary}`);
  parts.push(`rm -f /injected-tools/bin/${binary}-bin`);
  if (pattern === 'bundle') {
    parts.push(`rm -rf /injected-tools/${slug}`);
  }
  // Run in background so it never blocks workspace startup
  return `nohup sh -c '${parts.join(' && ')}' >/dev/null 2>&1 &`;
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
  const tool = allTools.find(t => t.providerId === toolId);
  if (!tool) {
    throw new Error(`Unknown AI tool: ${toolId}`);
  }

  const slug = getToolSlug(tool);
  const raw =
    'ref' in workspaceOrDevWorkspace ? workspaceOrDevWorkspace.ref : workspaceOrDevWorkspace;
  const cloned: devfileApi.DevWorkspace = JSON.parse(JSON.stringify(raw));
  const template = cloned.spec.template;
  template.components = template.components ?? [];
  template.commands = template.commands ?? [];

  const compName = `${slug}-injector`;
  const {
    install: installCmdId,
    symlink: symlinkCmdId,
    run: runCmdId,
    cleanup: cleanupCmdId,
  } = toolCommandIds(slug);

  // Remove existing injector for this tool (idempotent)
  template.components = template.components.filter(c => c.name !== compName);
  template.commands = template.commands.filter(
    (c: { id?: string }) =>
      c.id !== installCmdId && c.id !== symlinkCmdId && c.id !== runCmdId && c.id !== cleanupCmdId,
  );
  if (template.events?.preStart) {
    template.events.preStart = template.events.preStart.filter((e: string) => e !== installCmdId);
  }
  if (template.events?.postStart) {
    template.events.postStart = template.events.postStart.filter(
      (e: string) => e !== symlinkCmdId && e !== cleanupCmdId,
    );
  }

  // Ensure injected-tools volume exists
  if (!template.components.some(c => c.name === 'injected-tools')) {
    template.components.push({
      name: 'injected-tools',
      attributes: { [ADMIN_MANAGEABLE_ATTRIBUTE]: true },
      volume: { size: '256Mi' },
    } as unknown as DevWorkspaceComponent);
  }

  // Add injector component (init container)
  if (tool.pattern === 'init') {
    template.components.push({
      name: compName,
      attributes: { [ADMIN_MANAGEABLE_ATTRIBUTE]: true },
      container: {
        image: tool.injectorImage,
        command: ['/bin/sh'],
        args: [
          '-c',
          `rm -f /injected-tools/bin/${tool.binary} /injected-tools/bin/${tool.binary}-bin 2>/dev/null; mkdir -p /injected-tools/bin && cp /usr/local/bin/${tool.binary} /injected-tools/bin/${tool.binary} && { test -f /usr/local/bin/${tool.binary}-bin && cp /usr/local/bin/${tool.binary}-bin /injected-tools/bin/${tool.binary}-bin || true; }`,
        ],
        memoryLimit: '512Mi',
        mountSources: false,
        volumeMounts: [{ name: 'injected-tools', path: '/injected-tools' }],
      },
    } as unknown as DevWorkspaceComponent);
  } else {
    template.components.push({
      name: compName,
      attributes: { [ADMIN_MANAGEABLE_ATTRIBUTE]: true },
      container: {
        image: tool.injectorImage,
        command: ['/bin/sh'],
        args: [
          '-c',
          `rm -rf /injected-tools/${slug} 2>/dev/null; cp -a /opt/${slug}/. /injected-tools/${slug}/`,
        ],
        memoryLimit: '512Mi',
        mountSources: false,
        volumeMounts: [{ name: 'injected-tools', path: '/injected-tools' }],
      },
    } as unknown as DevWorkspaceComponent);
  }

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
  allTools: api.AiToolDefinition[],
): devfileApi.DevWorkspace {
  const tool = allTools.find(t => t.providerId === toolId);
  const slug = tool ? getToolSlug(tool) : toolId;
  const raw =
    'ref' in workspaceOrDevWorkspace ? workspaceOrDevWorkspace.ref : workspaceOrDevWorkspace;
  const cloned: devfileApi.DevWorkspace = JSON.parse(JSON.stringify(raw));
  const template = cloned.spec.template;
  const compName = `${slug}-injector`;
  const {
    install: installCmdId,
    symlink: symlinkCmdId,
    run: runCmdId,
    cleanup: cleanupCmdId,
  } = toolCommandIds(slug);

  if (template.components) {
    template.components = template.components.filter(c => c.name !== compName);
  }

  if (template.commands) {
    template.commands = template.commands.filter(
      (c: { id?: string }) =>
        c.id !== installCmdId &&
        c.id !== symlinkCmdId &&
        c.id !== runCmdId &&
        c.id !== cleanupCmdId,
    );
  }

  if (template.events?.preStart) {
    template.events.preStart = template.events.preStart.filter((e: string) => e !== installCmdId);
  }

  if (template.events?.postStart) {
    template.events.postStart = template.events.postStart.filter(
      (e: string) => e !== symlinkCmdId && e !== cleanupCmdId,
    );
  }

  // Add a postStart cleanup command to remove stale binaries from the shared volume.
  // The command is idempotent (rm -f) and will be removed by sanitizeStaleAiTools
  // once its corresponding injector component no longer exists AND no cleanup is pending.
  if (tool) {
    const editorName = findEditorComponentName(
      (template.components ?? []) as Array<{
        name?: string;
        container?: object;
        volume?: object;
      }>,
    );
    if (editorName) {
      const cleanupLine = buildCleanupCommandLine(tool);
      template.commands = template.commands ?? [];
      template.commands.push({
        id: cleanupCmdId,
        exec: {
          component: editorName,
          commandLine: cleanupLine,
          workingDir: '${CHE_PROJECTS_ROOT}',
          label: `Clean up ${tool.name}`,
        },
      } as unknown as DevWorkspaceCommand);

      template.events = template.events ?? {};
      template.events.postStart = template.events.postStart ?? [];
      template.events.postStart.push(cleanupCmdId);
    }
  }

  return cloned;
}

/**
 * Checks whether a component is an admin-manageable injector component.
 */
function isAdminManageable(comp: { attributes?: Record<string, unknown> }): boolean {
  return comp.attributes?.[ADMIN_MANAGEABLE_ATTRIBUTE] === true;
}

/**
 * Returns true if the component's container image matches any known tool (tag-agnostic).
 */
function isRecognizedToolImage(
  comp: { container?: { image?: string } },
  allTools: api.AiToolDefinition[],
): boolean {
  const image = comp.container?.image ?? '';
  if (image === '') {
    return false;
  }
  return allTools.some(t => stripImageTag(t.injectorImage) === stripImageTag(image));
}

/**
 * Removes all admin-manageable AI tool components whose injector image is
 * no longer recognized (not in `allTools`), along with their commands and events.
 * Also removes orphaned tool commands (install/symlink/run) whose
 * corresponding `*-injector` component no longer exists in the spec.
 * Cleanup commands are intentionally preserved — they must run at least
 * once to remove stale binaries from the shared volume.
 *
 * This prevents stale or outdated injector containers from breaking workspace starts.
 * Volume components with the admin-manageable attribute are preserved if at least one
 * recognized tool still exists; otherwise they are removed too.
 *
 * Returns null if no changes were made, or the patched DevWorkspace if stale tools were removed.
 */
export function sanitizeStaleAiTools(
  devWorkspace: devfileApi.DevWorkspace,
  allTools: api.AiToolDefinition[],
): devfileApi.DevWorkspace | null {
  const template = devWorkspace.spec.template;
  const components = (template.components ?? []) as Array<{
    name?: string;
    attributes?: Record<string, unknown>;
    container?: { image?: string };
    volume?: object;
  }>;

  // Find admin-manageable injector components (with containers) whose image is unrecognized
  const staleComponents = components.filter(
    c => isAdminManageable(c) && c.container && !isRecognizedToolImage(c, allTools),
  );

  // Collect slugs of all injector components that will remain after stale removal
  const staleNames = new Set(staleComponents.map(c => c.name).filter(Boolean));
  const remainingInjectorSlugs = new Set(
    components
      .filter(c => c.name?.endsWith('-injector') && !staleNames.has(c.name))
      .map(c => c.name!.replace(/-injector$/, '')),
  );

  // Find orphaned tool commands whose injector component no longer exists.
  // Cleanup commands are excluded — they must run at least once to remove stale binaries.
  const commands = (template.commands ?? []) as Array<{ id?: string }>;
  const toolCmdPattern = /^(install|symlink|run)-(.+)$/;
  const orphanedCommandIds = new Set<string>();
  for (const cmd of commands) {
    if (!cmd.id) {
      continue;
    }
    const match = cmd.id.match(toolCmdPattern);
    if (match && !remainingInjectorSlugs.has(match[2])) {
      orphanedCommandIds.add(cmd.id);
    }
  }

  if (staleComponents.length === 0 && orphanedCommandIds.size === 0) {
    return null;
  }

  const cloned: devfileApi.DevWorkspace = JSON.parse(JSON.stringify(devWorkspace));
  const clonedTemplate = cloned.spec.template;
  clonedTemplate.components = clonedTemplate.components ?? [];
  clonedTemplate.commands = clonedTemplate.commands ?? [];

  // Remove stale injector components
  clonedTemplate.components = (
    clonedTemplate.components as unknown as Array<{
      name?: string;
      attributes?: Record<string, unknown>;
      container?: { image?: string };
      volume?: object;
    }>
  ).filter(c => !staleNames.has(c.name)) as unknown as DevWorkspaceComponent[];

  // Collect command IDs to remove: stale component commands + orphaned commands
  const staleCommandIds = new Set<string>(orphanedCommandIds);
  for (const cmd of clonedTemplate.commands as Array<{
    id?: string;
    apply?: { component?: string };
  }>) {
    if (cmd.apply && cmd.id && staleNames.has(cmd.apply.component)) {
      staleCommandIds.add(cmd.id);
    }
  }

  for (const staleName of staleNames) {
    if (staleName && staleName.endsWith('-injector')) {
      const slug = staleName.replace(/-injector$/, '');
      const cmdIds = toolCommandIds(slug);
      staleCommandIds.add(cmdIds.install);
      staleCommandIds.add(cmdIds.symlink);
      staleCommandIds.add(cmdIds.run);
      staleCommandIds.add(cmdIds.cleanup);
    }
  }

  // Remove stale commands
  clonedTemplate.commands = (clonedTemplate.commands as unknown as Array<{ id?: string }>).filter(
    c => !staleCommandIds.has(c.id ?? ''),
  ) as unknown as DevWorkspaceCommand[];

  // Clean up events
  if (clonedTemplate.events?.preStart) {
    clonedTemplate.events.preStart = clonedTemplate.events.preStart.filter(
      (e: string) => !staleCommandIds.has(e),
    );
  }
  if (clonedTemplate.events?.postStart) {
    clonedTemplate.events.postStart = clonedTemplate.events.postStart.filter(
      (e: string) => !staleCommandIds.has(e),
    );
  }

  // Remove admin-manageable volume if no recognized injectors remain
  const hasRecognizedInjectors = (
    clonedTemplate.components as Array<{
      attributes?: Record<string, unknown>;
      container?: { image?: string };
    }>
  ).some(c => isAdminManageable(c) && c.container);

  if (!hasRecognizedInjectors) {
    clonedTemplate.components = (
      clonedTemplate.components as unknown as Array<{
        name?: string;
        attributes?: Record<string, unknown>;
        volume?: object;
      }>
    ).filter(c => !(isAdminManageable(c) && c.volume)) as unknown as DevWorkspaceComponent[];
  }

  return cloned;
}

/**
 * Updates admin-manageable AI tool components whose injector image is recognized
 * (same image name without tag) but outdated (different tag from the registry).
 *
 * For each outdated component the tool is removed and re-added using the
 * current registry definition, which updates the injector image, commands,
 * and lifecycle hooks to the latest version.
 *
 * When multiple tools share the same providerId the best match is selected
 * by tag priority: "next" > "latest" > highest semver > first in list.
 *
 * Returns null if no updates were needed, or the patched DevWorkspace.
 */
export function updateOutdatedAiTools(
  devWorkspace: devfileApi.DevWorkspace,
  allTools: api.AiToolDefinition[],
): devfileApi.DevWorkspace | null {
  const components = (devWorkspace.spec.template.components ?? []) as Array<{
    name?: string;
    attributes?: Record<string, unknown>;
    container?: { image?: string };
  }>;

  // Collect providerIds of outdated injectors
  const outdatedProviderIds: string[] = [];

  for (const comp of components) {
    if (!isAdminManageable(comp) || !comp.container?.image) {
      continue;
    }
    const image = comp.container.image;
    const imageBase = stripImageTag(image);

    // Find tools whose base image matches (recognized) but full image differs (outdated)
    const matchingTools = allTools.filter(t => stripImageTag(t.injectorImage) === imageBase);
    if (matchingTools.length === 0) {
      // Not recognized — handled by sanitizeStaleAiTools
      continue;
    }

    // If any matching tool has the exact same full image, this component is up-to-date
    if (matchingTools.some(t => t.injectorImage === image)) {
      continue;
    }

    // Component is outdated — pick the best replacement by providerId
    const providerId = matchingTools[0].providerId;
    if (!outdatedProviderIds.includes(providerId)) {
      outdatedProviderIds.push(providerId);
    }
  }

  if (outdatedProviderIds.length === 0) {
    return null;
  }

  let result: devfileApi.DevWorkspace = JSON.parse(JSON.stringify(devWorkspace));

  for (const providerId of outdatedProviderIds) {
    // Select the best tool for this provider
    const candidateTools = allTools.filter(t => t.providerId === providerId);
    const bestTool = selectBestTool(candidateTools);

    // Remove old, add new — pass a filtered tools list so addAiToolToWorkspace
    // picks the best version (find() returns the first match by providerId).
    const toolsWithBest = [bestTool, ...allTools.filter(t => t.providerId !== providerId)];
    result = removeAiToolFromWorkspace(result, providerId, allTools);
    result = addAiToolToWorkspace(result, bestTool.providerId, toolsWithBest);
  }

  return result;
}

/**
 * Selects the best tool from a list of candidates sharing the same providerId.
 * Priority: "next" > "latest" > highest semver > first in list.
 */
function selectBestTool(candidates: api.AiToolDefinition[]): api.AiToolDefinition {
  if (candidates.length === 1) {
    return candidates[0];
  }

  const priority: Record<string, number> = { next: 3, latest: 2 };

  let best = candidates[0];
  let bestScore = tagScore(best.tag, priority);

  for (let i = 1; i < candidates.length; i++) {
    const score = tagScore(candidates[i].tag, priority);
    if (score > bestScore) {
      best = candidates[i];
      bestScore = score;
    }
  }

  return best;
}

/**
 * Returns a numeric score for a tag to enable comparison.
 * Named tags ("next", "latest") get fixed high scores.
 * Semver-like tags get a score derived from their numeric components.
 */
function tagScore(tag: string, priority: Record<string, number>): number {
  if (priority[tag] !== undefined) {
    // Named tags always rank above any semver version
    return 1_000_000 + priority[tag];
  }
  // Try to parse as semver (e.g. "3.21", "2.55", "1.0.0")
  const parts = tag.split('.').map(Number);
  if (parts.length > 0 && parts.every(p => !isNaN(p))) {
    // Weight: major * 10000 + minor * 100 + patch
    return (parts[0] ?? 0) * 10000 + (parts[1] ?? 0) * 100 + (parts[2] ?? 0);
  }
  return 0;
}
