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

import { AiToolDefinition, findToolsByProviderIds, getToolSlug } from '@/services/catalog';
import { applyStorage, DEFAULT_STORAGE_TYPE, SandboxStorageType } from '@/services/sandboxStorage';
import {
  ResourceList,
  Sandbox,
  SANDBOX_API_VERSION_FULL,
  SANDBOX_KIND,
  SandboxContainer,
  SandboxEnvVar,
  SandboxPatch,
  SandboxPodSpec,
} from '@/services/types';

/** Tag chosen for a provider, keyed by provider id. */
export type AiToolVersions = Record<string, string>;

/**
 * The AI tools chosen in the UI.
 *
 * The wizard, the Getting Started gallery and the details page all collect the
 * same selection, so it travels separately from the rest of the form: a sample
 * brings its own manifest and only this is layered on top of it.
 */
export interface SandboxCustomization {
  /** Providers whose agent CLI is installed into the sandbox. */
  aiProviderIds: string[];
  /** Tag picked per provider; a provider absent here takes its first tool. */
  aiVersions?: AiToolVersions;
}

export const NO_CUSTOMIZATION: SandboxCustomization = { aiProviderIds: [] };

/**
 * Label put on the sandbox pod so a Service can select it.
 *
 * The controller labels the pod with a hash of the sandbox name
 * (`agents.x-k8s.io/sandbox-name-hash`) which is only readable from
 * `status.selector`, and therefore only after the sandbox exists. A label of
 * our own is deterministic, so anything addressing the pod - the Terminal tab
 * among them - can be written without a round trip.
 */
export const SANDBOX_POD_LABEL = 'che.eclipse.org/sandbox';

/** Values collected by the create wizard. */
export interface SandboxFormData {
  name: string;
  image: string;
  /** Shell command the agent runs; empty means the image's own entrypoint. */
  command: string;
  runtimeClassName: string;
  cpuLimit: string;
  memoryLimit: string;
  /** Providers whose agent CLI is installed into the sandbox. */
  aiProviderIds: string[];
  /** Tag picked per provider, for the providers that ship more than one. */
  aiVersions: AiToolVersions;
  /** Whether the sandbox keeps its work across a suspend. */
  storageType: SandboxStorageType;
}

/**
 * The sandbox pod runs with `restartPolicy: Never`, so a container that exits
 * takes the whole sandbox to 'Completed'. Most base images - the default one
 * included - have an entrypoint that returns at once without a TTY, which is
 * why the wizard keeps the container alive unless the user says otherwise.
 */
export const KEEP_ALIVE_COMMAND = 'sleep infinity';

export const DEFAULT_FORM_DATA: SandboxFormData = {
  name: '',
  image: 'registry.access.redhat.com/ubi9/ubi-minimal:9.6',
  command: KEEP_ALIVE_COMMAND,
  runtimeClassName: '',
  cpuLimit: '1',
  memoryLimit: '2Gi',
  aiProviderIds: [],
  aiVersions: {},
  storageType: DEFAULT_STORAGE_TYPE,
};

/**
 * Which agents the sandbox was created with, and at which version.
 *
 * A Sandbox is not a DevWorkspace, so nothing else records the selection; the
 * list reads the first to draw its icons and the details page reads both to
 * open the selector on what is actually installed.
 */
export const AI_PROVIDERS_ANNOTATION = 'che.eclipse.org/ai-providers';
export const AI_VERSIONS_ANNOTATION = 'che.eclipse.org/ai-tool-versions';

/**
 * The manifest the sandbox was created from, before anything was layered on.
 *
 * Mirrors `che.eclipse.org/devfile` of a DevWorkspace: the dashboard stores the
 * devfile a workspace was created from as an annotation and the Devfile tab
 * reads it back, because the live object is no longer the thing the user wrote.
 * The Manifest tab does the same with this.
 */
export const ORIGINAL_MANIFEST_ANNOTATION = 'che.eclipse.org/original-manifest';

/** Where the agent CLIs are installed. */
export const INJECTED_TOOLS_PATH = '/injected-tools';

export const INJECTED_TOOLS_VOLUME = 'injected-tools';

/**
 * PATH of the sandbox container, with the injected CLIs in front.
 *
 * The value is spelled out rather than built from `$(PATH)`: Kubernetes
 * resolves `$(VAR)` against the other entries of the same `env` list, not
 * against the image, so a reference there would expand to nothing.
 */
const BASE_PATH = '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin';

/**
 * Runtime classes offered by the wizard. The list is a convenience only - the
 * field is free text because which classes exist is cluster-specific and
 * listing `node.k8s.io/v1` RuntimeClasses needs cluster-scoped read access.
 */
export const SUGGESTED_RUNTIME_CLASSES = ['gvisor', 'kata-qemu', 'kata-containers', 'runsc'];

/** RFC 1123 label, the rule the API server applies to a Sandbox name. */
const RFC_1123_LABEL = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
const CPU_QUANTITY = /^\d+(\.\d+)?m?$/;
const MEMORY_QUANTITY = /^\d+(\.\d+)?(Ki|Mi|Gi|Ti|K|M|G|T)?$/;

export function validateName(name: string): string | undefined {
  if (name.length === 0) {
    return 'Name is required.';
  }
  if (name.length > 63) {
    return 'Name must be 63 characters or fewer.';
  }
  if (!RFC_1123_LABEL.test(name)) {
    return 'Name must consist of lowercase letters, digits and dashes, and start and end with a letter or digit.';
  }
  return undefined;
}

export function validateImage(image: string): string | undefined {
  if (image.trim().length === 0) {
    return 'Container image is required.';
  }
  if (/\s/.test(image.trim())) {
    return 'Container image must not contain whitespace.';
  }
  return undefined;
}

export function validateCpu(cpu: string): string | undefined {
  if (cpu.trim().length === 0) {
    return undefined;
  }
  return CPU_QUANTITY.test(cpu.trim())
    ? undefined
    : "CPU limit must be a Kubernetes quantity, for example '2' or '500m'.";
}

export function validateMemory(memory: string): string | undefined {
  if (memory.trim().length === 0) {
    return undefined;
  }
  return MEMORY_QUANTITY.test(memory.trim())
    ? undefined
    : "Memory limit must be a Kubernetes quantity, for example '2Gi' or '512Mi'.";
}

/**
 * Generate a valid Kubernetes RFC 1123 subdomain name from a display name.
 * Converts to lowercase, replaces spaces with hyphens, removes invalid characters,
 * and ensures the name is properly formatted.
 */
export function sanitizeKubernetesName(displayName: string): string {
  return displayName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9.-]/g, '')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
    .slice(0, 63);
}

/**
 * Generate a random suffix for unique resource names.
 * Returns 5 random lowercase alphanumeric characters.
 */
export function generateRandomSuffix(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export type SandboxFormErrors = Partial<Record<keyof SandboxFormData, string>>;

export function validateForm(data: SandboxFormData): SandboxFormErrors {
  const errors: SandboxFormErrors = {};

  const name = validateName(data.name);
  if (name) {
    errors.name = name;
  }
  const image = validateImage(data.image);
  if (image) {
    errors.image = image;
  }
  const cpu = validateCpu(data.cpuLimit);
  if (cpu) {
    errors.cpuLimit = cpu;
  }
  const memory = validateMemory(data.memoryLimit);
  if (memory) {
    errors.memoryLimit = memory;
  }

  return errors;
}

export function isFormValid(data: SandboxFormData): boolean {
  return Object.keys(validateForm(data)).length === 0;
}

/**
 * Secret the dashboard stores an AI provider key in.
 *
 * Must stay in step with `toSecretName` of the backend's `aiProviderKeyApi` -
 * that service owns the secret, Agent Space only reads it.
 */
export function toAiKeySecretName(envVarName: string): string {
  return 'ai-provider-' + envVarName.toLowerCase().replace(/_/g, '-');
}

/** Name of the init container that installs one agent CLI. */
function toInjectorName(tool: AiToolDefinition): string {
  return `${getToolSlug(tool)}-injector`.slice(0, 63);
}

/**
 * Init container that puts one agent CLI on the shared tools volume.
 *
 * Same two layouts as the dashboard's injectors: an `init` image ships the
 * binary in `/usr/local/bin`, a `bundle` image ships a directory under `/opt`
 * that has to be linked into `bin` afterwards.
 */
function buildInjectorContainer(tool: AiToolDefinition): SandboxContainer {
  const slug = getToolSlug(tool);
  const binDir = `${INJECTED_TOOLS_PATH}/bin`;

  const script =
    tool.pattern === 'init'
      ? `mkdir -p ${binDir} && cp /usr/local/bin/${tool.binary} ${binDir}/${tool.binary} && ` +
        `{ test -f /usr/local/bin/${tool.binary}-bin && cp /usr/local/bin/${tool.binary}-bin ${binDir}/${tool.binary}-bin || true; }`
      : `rm -rf ${INJECTED_TOOLS_PATH}/${slug}; mkdir -p ${INJECTED_TOOLS_PATH}/${slug} ${binDir} && ` +
        `cp -a /opt/${slug}/. ${INJECTED_TOOLS_PATH}/${slug}/ && ` +
        `ln -sf ${INJECTED_TOOLS_PATH}/${slug}/bin/${tool.binary} ${binDir}/${tool.binary} && ` +
        `{ test -f ${INJECTED_TOOLS_PATH}/${slug}/bin/node && ln -sf ${INJECTED_TOOLS_PATH}/${slug}/bin/node ${binDir}/node || true; }`;

  return {
    name: toInjectorName(tool),
    image: tool.injectorImage,
    command: ['/bin/sh', '-c'],
    args: [script],
    volumeMounts: [{ name: INJECTED_TOOLS_VOLUME, mountPath: INJECTED_TOOLS_PATH }],
  };
}

/**
 * Environment entry that hands one agent its API key.
 *
 * The key is optional so a sandbox still starts before the user has saved one;
 * the agent then asks for it at first use.
 */
function buildToolKeyEnv(envVarName: string): SandboxEnvVar {
  return {
    name: envVarName,
    valueFrom: {
      secretKeyRef: {
        name: toAiKeySecretName(envVarName),
        key: envVarName,
        optional: true,
      },
    },
  };
}

/**
 * Takes every trace of a previous agent selection back out of a pod spec.
 *
 * The selection can be changed on a sandbox that already has one, so applying
 * it has to start from a clean pod spec rather than stack a second set of
 * injectors on top of the first. Everything removed here is something
 * {@link applyAiTools} put there, identified against the cluster catalogue so
 * nothing the sample itself declared is touched.
 */
function stripAiTools(podSpec: SandboxPodSpec, catalogue: AiToolDefinition[]): SandboxPodSpec {
  const injectorNames = new Set(catalogue.map(toInjectorName));
  const keyNames = new Set(
    catalogue
      .map(tool => tool.envVarName)
      .filter((name): name is string => name !== undefined && name.length > 0),
  );

  const [target, ...otherContainers] = podSpec.containers;
  if (target === undefined) {
    return podSpec;
  }

  const env = (target.env ?? []).filter(entry => !keyNames.has(entry.name));
  const pathIndex = env.findIndex(entry => entry.name === 'PATH');
  if (pathIndex !== -1) {
    const prefix = `${INJECTED_TOOLS_PATH}/bin:`;
    const value = env[pathIndex].value ?? '';
    if (value.startsWith(prefix)) {
      const restored = value.slice(prefix.length);
      if (restored === BASE_PATH) {
        env.splice(pathIndex, 1);
      } else {
        env[pathIndex] = { ...env[pathIndex], value: restored };
      }
    }
  }

  const volumeMounts = (target.volumeMounts ?? []).filter(
    mount => mount.name !== INJECTED_TOOLS_VOLUME,
  );
  const initContainers = (podSpec.initContainers ?? []).filter(
    container => !injectorNames.has(container.name),
  );
  const volumes = (podSpec.volumes ?? []).filter(volume => volume.name !== INJECTED_TOOLS_VOLUME);

  // Rebuilt rather than spread over: a key left behind as `undefined` would be
  // dumped into the manifest preview as an empty value.
  const restPodSpec = omit(podSpec, 'initContainers', 'volumes', 'containers');
  const restTarget = omit(target, 'env', 'volumeMounts');

  return {
    ...restPodSpec,
    ...(initContainers.length > 0 ? { initContainers } : {}),
    containers: [
      {
        ...restTarget,
        ...(env.length > 0 ? { env } : {}),
        ...(volumeMounts.length > 0 ? { volumeMounts } : {}),
      },
      ...otherContainers,
    ],
    ...(volumes.length > 0 ? { volumes } : {}),
  };
}

/**
 * Adds one injector init container per agent, and puts the injected CLIs on
 * the PATH of the container the sandbox is named after.
 */
function applyAiTools(podSpec: SandboxPodSpec, tools: AiToolDefinition[]): SandboxPodSpec {
  const [target, ...otherContainers] = podSpec.containers;

  // A sample may set its own PATH; the injected CLIs go in front of it rather
  // than replacing it, so whatever the sample put there still resolves.
  const basePath = target.env?.find(entry => entry.name === 'PATH')?.value ?? BASE_PATH;
  const env: SandboxEnvVar[] = (target.env ?? []).filter(entry => entry.name !== 'PATH');
  for (const tool of tools) {
    if (tool.envVarName !== undefined) {
      env.push(buildToolKeyEnv(tool.envVarName));
    }
  }
  env.push({ name: 'PATH', value: `${INJECTED_TOOLS_PATH}/bin:${basePath}` });

  return {
    ...podSpec,
    initContainers: [...(podSpec.initContainers ?? []), ...tools.map(buildInjectorContainer)],
    containers: [
      {
        ...target,
        env,
        volumeMounts: [
          ...(target.volumeMounts ?? []),
          { name: INJECTED_TOOLS_VOLUME, mountPath: INJECTED_TOOLS_PATH },
        ],
      },
      ...otherContainers,
    ],
    volumes: [
      ...(podSpec.volumes ?? []),
      { name: INJECTED_TOOLS_VOLUME, emptyDir: { sizeLimit: '512Mi' } },
    ],
  };
}

/** `anthropic/claude-code=1.0.2,openai/codex=0.9.0`, as the annotation holds it. */
function formatAiVersions(tools: AiToolDefinition[]): string {
  return tools.map(tool => `${tool.providerId}=${tool.tag}`).join(',');
}

/**
 * Layers the chosen agents onto a manifest.
 *
 * The wizard, the Getting Started gallery and the details page arrive from
 * different ends - the wizard builds the manifest here, a sample comes with one
 * already written, the details page brings one the API server returned - so all
 * three go through this and end up with the same annotations, the same injector
 * init containers and the same PATH.
 *
 * Applying is idempotent: a previous selection is taken back out first, which
 * is what makes changing the agents of a running sandbox a plain patch.
 *
 * The argument is left untouched.
 */
export function applyCustomization(
  sandbox: Sandbox,
  customization: SandboxCustomization,
  aiTools: AiToolDefinition[] = [],
): Sandbox {
  const tools = findToolsByProviderIds(
    aiTools,
    customization.aiProviderIds,
    customization.aiVersions,
  );

  const annotations: Record<string, string> = { ...sandbox.metadata.annotations };
  if (tools.length > 0) {
    annotations[AI_PROVIDERS_ANNOTATION] = tools.map(tool => tool.providerId).join(',');
    annotations[AI_VERSIONS_ANNOTATION] = formatAiVersions(tools);
  } else {
    delete annotations[AI_PROVIDERS_ANNOTATION];
    delete annotations[AI_VERSIONS_ANNOTATION];
  }

  const original = sandbox.spec.podTemplate.spec;
  const [target] = original.containers;

  let podSpec = stripAiTools(original, aiTools);
  if (target !== undefined && tools.length > 0) {
    podSpec = applyAiTools(podSpec, tools);
  }

  // Nothing was recorded, so nothing is written: an empty `annotations: {}` in
  // the manifest preview reads as a setting the user forgot to fill in.
  const metadata =
    Object.keys(annotations).length > 0
      ? { ...sandbox.metadata, annotations }
      : omitAnnotations(sandbox.metadata);

  const podMetadata = sandbox.spec.podTemplate.metadata;

  return {
    ...sandbox,
    metadata,
    spec: {
      ...sandbox.spec,
      podTemplate: {
        ...sandbox.spec.podTemplate,
        metadata: {
          ...podMetadata,
          labels: {
            ...podMetadata?.labels,
            [SANDBOX_POD_LABEL]: sandbox.metadata.name,
          },
        },
        spec: podSpec,
      },
    },
  };
}

/**
 * Merge patch that changes the agents of a sandbox that already exists.
 *
 * `spec.podTemplate` is sent whole rather than merged field by field: a merge
 * patch cannot take an entry out of a list, and dropping an agent means taking
 * its injector out of `initContainers`. The two annotations are sent as `null`
 * when nothing is selected, which is how RFC 7386 removes a key.
 *
 * The CRD's only validation rule is that `volumeClaimTemplates` is immutable,
 * and this touches neither it nor anything else outside the pod template.
 */
export function buildAiToolsPatch(
  sandbox: Sandbox,
  customization: SandboxCustomization,
  aiTools: AiToolDefinition[] = [],
): SandboxPatch {
  const desired = applyCustomization(sandbox, customization, aiTools);
  const annotations = desired.metadata.annotations;

  return {
    metadata: {
      annotations: {
        [AI_PROVIDERS_ANNOTATION]: annotations?.[AI_PROVIDERS_ANNOTATION] ?? null,
        [AI_VERSIONS_ANNOTATION]: annotations?.[AI_VERSIONS_ANNOTATION] ?? null,
      },
    },
    spec: { podTemplate: desired.spec.podTemplate },
  };
}

/** Copy of `source` with the given keys dropped rather than left as `undefined`. */
function omit<T extends object, K extends keyof T>(source: T, ...keys: K[]): Omit<T, K> {
  const rest: Omit<T, K> & Partial<Pick<T, K>> = { ...source };
  for (const key of keys) {
    delete rest[key];
  }
  return rest;
}

/** The metadata without its annotations, when the last one has been removed. */
function omitAnnotations(metadata: Sandbox['metadata']): Sandbox['metadata'] {
  if (metadata.annotations === undefined) {
    return metadata;
  }
  return omit(metadata, 'annotations');
}

/**
 * Builds the Sandbox the wizard submits.
 *
 * Requests are derived from the limits rather than asked for separately: an
 * MVP wizard with four fields should still produce a manifest that schedules
 * on a namespace with a LimitRange.
 *
 * `aiTools` is the cluster catalogue, needed to turn the selected provider ids
 * into injector images and key environment variables. Nothing is injected when
 * it is empty.
 *
 * No `securityContext` is set anywhere: OpenShift's `restricted-v2` SCC picks
 * the UID and the fsGroup from the namespace range and rejects a pod that asks
 * for different ones.
 */
export function buildSandbox(
  data: SandboxFormData,
  namespace: string,
  aiTools: AiToolDefinition[] = [],
): Sandbox {
  const limits: ResourceList = {};
  const requests: ResourceList = {};

  const cpu = data.cpuLimit.trim();
  if (cpu) {
    limits.cpu = cpu;
    requests.cpu = cpu;
  }
  const memory = data.memoryLimit.trim();
  if (memory) {
    limits.memory = memory;
    requests.memory = memory;
  }

  const container: SandboxContainer = {
    name: 'agent',
    image: data.image.trim(),
  };
  const command = data.command.trim();
  if (command) {
    container.command = ['/bin/sh', '-c', command];
  }
  if (Object.keys(limits).length > 0) {
    container.resources = { limits, requests };
  }

  const runtimeClassName = data.runtimeClassName.trim();

  const sandbox: Sandbox = {
    apiVersion: SANDBOX_API_VERSION_FULL,
    kind: SANDBOX_KIND,
    metadata: {
      name: data.name.trim(),
      namespace,
    },
    spec: {
      podTemplate: {
        spec: {
          ...(runtimeClassName ? { runtimeClassName } : {}),
          restartPolicy: 'Never',
          // The agent workload has no reason to talk to the API server.
          automountServiceAccountToken: false,
          containers: [container],
        },
      },
    },
  };

  // Storage goes on last so it reads as a layer over the finished sandbox, the
  // same way the details page lays it over a live one.
  return applyStorage(
    applyCustomization(
      sandbox,
      { aiProviderIds: data.aiProviderIds, aiVersions: data.aiVersions },
      aiTools,
    ),
    data.storageType,
  );
}

/**
 * Prepares a sample manifest for creation in the user's namespace: the sample
 * name is only a default, and the namespace always comes from the UI.
 */
export function applySampleOverrides(sample: Sandbox, namespace: string, name?: string): Sandbox {
  return {
    ...sample,
    apiVersion: SANDBOX_API_VERSION_FULL,
    kind: SANDBOX_KIND,
    metadata: {
      ...sample.metadata,
      name: name?.trim() || sample.metadata.name,
      namespace,
    },
  };
}

/**
 * Records the manifest a sandbox was created from, before any of the above ran.
 *
 * The live object the API server returns is not what the user picked: the
 * controller defaults half of it and the selection above adds to the rest. The
 * Manifest tab shows what was asked for, so what was asked for is kept.
 */
export function withOriginalManifest(sandbox: Sandbox, manifest: string): Sandbox {
  return {
    ...sandbox,
    metadata: {
      ...sandbox.metadata,
      annotations: {
        ...sandbox.metadata.annotations,
        [ORIGINAL_MANIFEST_ANNOTATION]: manifest,
      },
    },
  };
}
