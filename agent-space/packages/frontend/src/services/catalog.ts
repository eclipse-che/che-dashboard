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

import axios, { AxiosInstance } from 'axios';

/**
 * The AI-tool catalogue the dashboard already publishes.
 *
 * Agent Space is a separate bundle with its own dependency tree - it does not
 * depend on `@eclipse-che/common` - so the few shapes it needs are restated
 * here as the subset it actually reads. They mirror `api.IAiRegistry` of the
 * dashboard backend.
 */

/** Where the dashboard backend is mounted; see `baseApiPath` in the backend. */
const DASHBOARD_API_PATH = '/dashboard/api';

/** Who makes an AI tool. Mirrors `api.AiProviderDefinition`. */
export interface AiProviderDefinition {
  id: string;
  name: string;
  publisher: string;
  description?: string;
  docsUrl?: string;
  icon?: string;
  tags?: string[];
}

/** How an AI tool is injected. Mirrors `api.AiToolDefinition`. */
export interface AiToolDefinition {
  providerId: string;
  tag: string;
  name: string;
  url: string;
  binary: string;
  pattern: 'init' | 'bundle';
  injectorImage: string;
  /** API key environment variable the tool reads, when it needs one. */
  envVarName?: string;
  setupCommand?: string;
  arch?: string[];
}

export interface Catalog {
  /** Node architecture, as `/cluster-config` reports it, e.g. `amd64`. */
  currentArchitecture?: string;
  aiProviders: AiProviderDefinition[];
  aiTools: AiToolDefinition[];
}

export const EMPTY_CATALOG: Catalog = {
  aiProviders: [],
  aiTools: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const items = value.filter((item): item is string => typeof item === 'string');
  return items.length > 0 ? items : undefined;
}

function toAiProvider(raw: unknown): AiProviderDefinition | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }
  const id = asString(raw.id);
  const name = asString(raw.name);
  if (id === undefined || name === undefined) {
    return undefined;
  }
  return {
    id,
    name,
    publisher: asString(raw.publisher) ?? '',
    description: asString(raw.description),
    docsUrl: asString(raw.docsUrl),
    icon: asString(raw.icon),
    tags: asStringArray(raw.tags),
  };
}

function toAiTool(raw: unknown): AiToolDefinition | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }
  const providerId = asString(raw.providerId);
  const name = asString(raw.name);
  const injectorImage = asString(raw.injectorImage);
  if (providerId === undefined || name === undefined || injectorImage === undefined) {
    return undefined;
  }
  return {
    providerId,
    tag: asString(raw.tag) ?? 'latest',
    name,
    url: asString(raw.url) ?? '',
    binary: asString(raw.binary) ?? '',
    pattern: raw.pattern === 'bundle' ? 'bundle' : 'init',
    injectorImage,
    envVarName: asString(raw.envVarName),
    setupCommand: asString(raw.setupCommand),
    arch: asStringArray(raw.arch),
  };
}

export function parseAiRegistry(payload: unknown): {
  aiProviders: AiProviderDefinition[];
  aiTools: AiToolDefinition[];
} {
  if (!isRecord(payload)) {
    return { aiProviders: [], aiTools: [] };
  }
  const providers = Array.isArray(payload.providers) ? payload.providers : [];
  const tools = Array.isArray(payload.tools) ? payload.tools : [];

  return {
    aiProviders: providers
      .map(toAiProvider)
      .filter((provider): provider is AiProviderDefinition => provider !== undefined),
    aiTools: tools.map(toAiTool).filter((tool): tool is AiToolDefinition => tool !== undefined),
  };
}

/**
 * Reads the AI catalogue from the dashboard backend.
 *
 * Both requests are optional: Agent Space can also run against a cluster
 * without the AI registry ConfigMap, and in `mock` mode there is no backend at
 * all. A failure leaves that part of the catalogue empty and the selectors
 * hide themselves, rather than failing the create page as a whole.
 */
export async function fetchCatalog(baseUrl = '', http?: AxiosInstance): Promise<Catalog> {
  const client =
    http ??
    axios.create({
      baseURL: baseUrl || undefined,
      headers: { Accept: 'application/json' },
    });

  const get = async (path: string): Promise<unknown> => {
    try {
      const response = await client.get<unknown>(`${DASHBOARD_API_PATH}${path}`);
      return response.data;
    } catch {
      return undefined;
    }
  };

  const [registryPayload, clusterConfigPayload] = await Promise.all([
    get('/ai-registry'),
    get('/cluster-config'),
  ]);

  const { aiProviders, aiTools } = parseAiRegistry(registryPayload);

  return {
    currentArchitecture: parseCurrentArchitecture(clusterConfigPayload),
    aiProviders,
    aiTools,
  };
}

export function parseCurrentArchitecture(payload: unknown): string | undefined {
  return isRecord(payload) ? asString(payload.currentArchitecture) : undefined;
}

/**
 * The tools of each provider, one group per provider, providers in name
 * order. A provider with several versions keeps them in one group, the way
 * the dashboard's own AI gallery shows them.
 */
export function groupToolsByProvider(tools: AiToolDefinition[]): AiToolDefinition[][] {
  const groups = new Map<string, AiToolDefinition[]>();
  for (const tool of [...tools].sort((a, b) => a.name.localeCompare(b.name))) {
    const group = groups.get(tool.providerId);
    if (group === undefined) {
      groups.set(tool.providerId, [tool]);
    } else {
      group.push(tool);
    }
  }
  return Array.from(groups.values());
}

/**
 * Kubernetes-safe short name of a tool, taken from its injector image.
 *
 * Ported from `services/helpers/aiTools` of the dashboard so an injected tool
 * lands in the same `/injected-tools/<slug>` directory in both products.
 * e.g. `quay.io/example/claude-code:next` becomes `claude-code`.
 */
export function getToolSlug(tool: AiToolDefinition): string {
  const imagePath = tool.injectorImage.split(':')[0];
  const lastSegment = imagePath.split('/').pop();
  return lastSegment !== undefined && lastSegment.length > 0 ? lastSegment : tool.binary;
}

/**
 * One tool per selected provider; a provider with no tool cannot be injected.
 *
 * `versions` names the tag to take for a provider that ships several. A tag
 * that is no longer in the catalogue falls back to the provider's first tool,
 * so a sandbox created against an older registry still opens.
 */
export function findToolsByProviderIds(
  tools: AiToolDefinition[],
  providerIds: string[],
  versions: Record<string, string> = {},
): AiToolDefinition[] {
  return providerIds
    .map(id => {
      const tag = versions[id];
      const tagged =
        tag === undefined
          ? undefined
          : tools.find(tool => tool.providerId === id && tool.tag === tag);
      return tagged ?? tools.find(tool => tool.providerId === id);
    })
    .filter((tool): tool is AiToolDefinition => tool !== undefined);
}
