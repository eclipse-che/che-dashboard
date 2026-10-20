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

import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

import {
  AiToolDefinition,
  fetchCatalog,
  findToolsByProviderIds,
  getToolSlug,
  groupToolsByProvider,
  parseAiRegistry,
  parseCurrentArchitecture,
} from '@/services/catalog';

function tool(overrides: Partial<AiToolDefinition> = {}): AiToolDefinition {
  return {
    providerId: 'anthropic',
    tag: 'latest',
    name: 'Claude Code',
    url: 'https://example.com',
    binary: 'claude',
    pattern: 'init',
    injectorImage: 'quay.io/example/claude-code:next',
    ...overrides,
  };
}

/** Replies to each dashboard endpoint with what the test puts in the map. */
function stubCatalogHttp(replies: Record<string, { status: number; data?: unknown }>) {
  const urls: string[] = [];

  const http = axios.create({
    adapter: async (config: InternalAxiosRequestConfig) => {
      const url = String(config.url);
      urls.push(url);

      const { status, data } = replies[url] ?? { status: 404 };
      const response: AxiosResponse = { status, statusText: '', data, headers: {}, config };
      if (status >= 400) {
        throw new AxiosError('failed', String(status), config, {}, response);
      }
      return response;
    },
  });

  return { http, urls };
}

describe('parseAiRegistry', () => {
  it('reads the providers and the tools the registry publishes', () => {
    expect(
      parseAiRegistry({
        providers: [
          {
            id: 'anthropic',
            name: 'Anthropic',
            publisher: 'Anthropic',
            description: 'Claude',
            docsUrl: 'https://docs.example.com',
            icon: '/icon.svg',
            tags: ['AI'],
          },
        ],
        tools: [
          {
            providerId: 'anthropic',
            tag: 'next',
            name: 'Claude Code',
            url: 'https://example.com',
            binary: 'claude',
            pattern: 'bundle',
            injectorImage: 'quay.io/example/claude-code:next',
            envVarName: 'ANTHROPIC_API_KEY',
            setupCommand: 'claude --version',
            arch: ['amd64'],
          },
        ],
      }),
    ).toEqual({
      aiProviders: [
        {
          id: 'anthropic',
          name: 'Anthropic',
          publisher: 'Anthropic',
          description: 'Claude',
          docsUrl: 'https://docs.example.com',
          icon: '/icon.svg',
          tags: ['AI'],
        },
      ],
      aiTools: [
        {
          providerId: 'anthropic',
          tag: 'next',
          name: 'Claude Code',
          url: 'https://example.com',
          binary: 'claude',
          pattern: 'bundle',
          injectorImage: 'quay.io/example/claude-code:next',
          envVarName: 'ANTHROPIC_API_KEY',
          setupCommand: 'claude --version',
          arch: ['amd64'],
        },
      ],
      defaultAiProviders: [],
    });
  });

  it('reads the providers the administrator made the default', () => {
    const { defaultAiProviders } = parseAiRegistry({
      providers: [],
      tools: [],
      defaultAiProviders: ['anthropic', 'google/gemini'],
    });

    expect(defaultAiProviders).toEqual(['anthropic', 'google/gemini']);
  });

  it('falls back for the fields a registry may leave out', () => {
    const { aiProviders, aiTools } = parseAiRegistry({
      providers: [{ id: 'anthropic', name: 'Anthropic' }],
      tools: [{ providerId: 'anthropic', name: 'Claude Code', injectorImage: 'image' }],
    });

    expect(aiProviders[0].publisher).toBe('');
    expect(aiTools[0]).toEqual({
      providerId: 'anthropic',
      tag: 'latest',
      name: 'Claude Code',
      url: '',
      binary: '',
      pattern: 'init',
      injectorImage: 'image',
      envVarName: undefined,
      setupCommand: undefined,
      arch: undefined,
    });
  });

  it('drops entries that could not be used', () => {
    const { aiProviders, aiTools } = parseAiRegistry({
      providers: [{ id: 'no-name' }, { name: 'no-id' }, 'nope'],
      tools: [{ providerId: 'p' }, { name: 'n' }, { providerId: 'p', name: 'n' }, 42],
    });

    expect(aiProviders).toEqual([]);
    expect(aiTools).toEqual([]);
  });

  it('returns nothing for a registry that is missing or unexpected', () => {
    const nothing = { aiProviders: [], aiTools: [], defaultAiProviders: [] };
    expect(parseAiRegistry(undefined)).toEqual(nothing);
    expect(parseAiRegistry({})).toEqual(nothing);
  });
});

describe('parseCurrentArchitecture', () => {
  it('reads the node architecture the cluster reports', () => {
    expect(parseCurrentArchitecture({ currentArchitecture: 'arm64' })).toBe('arm64');
  });

  it('returns nothing when the endpoint is unavailable', () => {
    expect(parseCurrentArchitecture(undefined)).toBeUndefined();
    expect(parseCurrentArchitecture({})).toBeUndefined();
  });
});

describe('fetchCatalog', () => {
  it('reads both dashboard endpoints', async () => {
    const { http, urls } = stubCatalogHttp({
      '/dashboard/api/ai-registry': {
        status: 200,
        data: {
          providers: [{ id: 'anthropic', name: 'Anthropic' }],
          tools: [{ providerId: 'anthropic', name: 'Claude Code', injectorImage: 'image' }],
        },
      },
      '/dashboard/api/cluster-config': { status: 200, data: { currentArchitecture: 'amd64' } },
    });

    const catalog = await fetchCatalog('', http);

    expect(urls.sort()).toEqual(['/dashboard/api/ai-registry', '/dashboard/api/cluster-config']);
    expect(catalog.currentArchitecture).toBe('amd64');
    expect(catalog.aiProviders).toHaveLength(1);
    expect(catalog.aiTools).toHaveLength(1);
  });

  it('keeps the rest of the catalogue when one endpoint is not served', async () => {
    const { http } = stubCatalogHttp({
      '/dashboard/api/cluster-config': { status: 200, data: { currentArchitecture: 'amd64' } },
    });

    const catalog = await fetchCatalog('', http);

    expect(catalog.currentArchitecture).toBe('amd64');
    expect(catalog.aiTools).toEqual([]);
    expect(catalog.aiProviders).toEqual([]);
  });

  it('creates its own client against the configured base URL', async () => {
    const { http } = stubCatalogHttp({});
    const create = jest.spyOn(axios, 'create').mockReturnValue(http);

    await fetchCatalog('http://localhost:8080');

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: 'http://localhost:8080' }),
    );

    await fetchCatalog();

    expect(create).toHaveBeenLastCalledWith(expect.objectContaining({ baseURL: undefined }));
    create.mockRestore();
  });
});

describe('groupToolsByProvider', () => {
  it('groups the tools of one provider together, in name order', () => {
    const groups = groupToolsByProvider([
      tool({ providerId: 'openai', name: 'Codex' }),
      tool({ name: 'Claude Code' }),
      tool({ name: 'Anthropic CLI' }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].map(t => t.name)).toEqual(['Anthropic CLI', 'Claude Code']);
    expect(groups[1].map(t => t.name)).toEqual(['Codex']);
  });
});

describe('getToolSlug', () => {
  it('takes the image name without its registry and tag', () => {
    expect(getToolSlug(tool())).toBe('claude-code');
    expect(getToolSlug(tool({ injectorImage: 'claude-code' }))).toBe('claude-code');
  });

  it('falls back to the binary when the image has no usable name', () => {
    expect(getToolSlug(tool({ injectorImage: ':latest', binary: 'claude' }))).toBe('claude');
  });
});

describe('findToolsByProviderIds', () => {
  const tools = [tool(), tool({ providerId: 'openai', name: 'Codex' })];

  it('returns one tool per selected provider, in the order they were selected', () => {
    expect(findToolsByProviderIds(tools, ['openai', 'anthropic']).map(t => t.name)).toEqual([
      'Codex',
      'Claude Code',
    ]);
  });

  it('skips a provider that has no tool to inject', () => {
    expect(findToolsByProviderIds(tools, ['gone'])).toEqual([]);
  });

  it('takes the tag the user picked for a provider that ships several', () => {
    const versioned = [tool({ tag: 'latest' }), tool({ tag: 'next' })];

    expect(findToolsByProviderIds(versioned, ['anthropic'], { anthropic: 'next' })[0].tag).toBe(
      'next',
    );
  });

  it('falls back to the first tool when the picked tag is gone', () => {
    expect(findToolsByProviderIds(tools, ['anthropic'], { anthropic: '0.0.1' })[0].tag).toBe(
      'latest',
    );
  });
});
