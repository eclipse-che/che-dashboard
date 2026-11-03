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
  fetchSampleManifest,
  fetchSamples,
  fetchSampleSandbox,
  parseSamplesIndex,
  resolveSampleIcon,
  SandboxSample,
  toSandbox,
} from '@/services/samples';
import { SandboxClientError } from '@/services/types';

const INDEX_URL = './registry/sandbox/index.json';

const VALID_ENTRY = {
  id: 'hello-world',
  displayName: 'Hello World',
  description: 'The smallest possible Sandbox.',
  tags: ['Basic', 42],
  icon: '/images/sandbox.svg',
  source: {
    url: 'https://github.com/kubernetes-sigs/agent-sandbox',
    ref: 'main',
    path: 'examples/hello-world-sandbox/hello-world.yaml',
  },
  manifest: { filename: 'hello-world.yaml' },
};

describe('parseSamplesIndex', () => {
  it('returns nothing for a non-array', () => {
    expect(parseSamplesIndex({})).toEqual([]);
  });

  it('parses a complete entry and drops non-string tags', () => {
    expect(parseSamplesIndex([VALID_ENTRY])).toEqual([
      {
        id: 'hello-world',
        displayName: 'Hello World',
        description: 'The smallest possible Sandbox.',
        tags: ['Basic'],
        icon: '/images/sandbox.svg',
        notes: undefined,
        filename: 'hello-world.yaml',
      },
    ]);
  });

  it('skips entries without an id or a display name', () => {
    expect(parseSamplesIndex([{ id: 'x' }, { displayName: 'y' }, 'nope'])).toEqual([]);
  });

  it('falls back to <id>.yaml when the index was not regenerated', () => {
    expect(parseSamplesIndex([{ id: 'a', displayName: 'A' }])[0].filename).toBe('a.yaml');
    expect(
      parseSamplesIndex([{ id: 'a', displayName: 'A', manifest: { filename: '' } }])[0].filename,
    ).toBe('a.yaml');
  });
});

describe('resolveSampleIcon', () => {
  const sample: SandboxSample = {
    id: 'hello-world',
    displayName: 'Hello World',
    tags: [],
    filename: 'hello-world.yaml',
  };

  it('resolves a registry-relative icon against the registry root', () => {
    // The icon lives beside the samples directory, not inside it.
    expect(resolveSampleIcon(INDEX_URL, { ...sample, icon: '/images/sandbox.svg' })).toBe(
      './registry/images/sandbox.svg',
    );
  });

  it('resolves an icon recorded without a leading slash', () => {
    expect(resolveSampleIcon(INDEX_URL, { ...sample, icon: 'images/sandbox.svg' })).toBe(
      './registry/images/sandbox.svg',
    );
  });

  it('leaves an absolute icon url alone', () => {
    const icon = 'https://example.com/sandbox.svg';

    expect(resolveSampleIcon(INDEX_URL, { ...sample, icon })).toBe(icon);
  });

  it('leaves an inline icon alone', () => {
    const icon = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=';

    expect(resolveSampleIcon(INDEX_URL, { ...sample, icon })).toBe(icon);
  });

  it('has nothing to resolve when the index names no icon', () => {
    expect(resolveSampleIcon(INDEX_URL, sample)).toBeUndefined();
  });
});

describe('toSandbox', () => {
  const manifest = {
    apiVersion: 'agents.x-k8s.io/v1beta1',
    kind: 'Sandbox',
    metadata: { name: 'hello-world' },
    spec: { podTemplate: { spec: { containers: [] } } },
  };

  it('accepts a well-formed manifest', () => {
    expect(toSandbox(manifest, 'hello-world').metadata.name).toBe('hello-world');
  });

  it('rejects a non-object document', () => {
    expect(() => toSandbox('text', 'x')).toThrow(SandboxClientError);
  });

  it('rejects another kind', () => {
    expect(() => toSandbox({ ...manifest, kind: 'Deployment' }, 'x')).toThrow(/expected 'Sandbox'/);
  });

  it('rejects a manifest without a name', () => {
    expect(() => toSandbox({ ...manifest, metadata: {} }, 'x')).toThrow(/metadata.name/);
  });

  it('rejects a manifest without a pod template', () => {
    expect(() => toSandbox({ ...manifest, spec: {} }, 'x')).toThrow(/spec.podTemplate/);
  });
});

describe('fetchSamples', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('loads and parses the index', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [VALID_ENTRY] });

    const samples = await fetchSamples(INDEX_URL);

    expect(samples).toHaveLength(1);
    expect(samples[0].id).toBe('hello-world');
  });

  it('throws a typed error when the index is unreachable', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });

    await expect(fetchSamples(INDEX_URL)).rejects.toThrow(SandboxClientError);
  });
});

describe('fetchSampleSandbox', () => {
  const originalFetch = global.fetch;
  const sample: SandboxSample = {
    id: 'hello-world',
    displayName: 'Hello World',
    tags: [],
    filename: 'hello-world.yaml',
  };

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('resolves the manifest next to the index and parses it', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        [
          'apiVersion: agents.x-k8s.io/v1beta1',
          'kind: Sandbox',
          'metadata:',
          '  name: hello-world',
          'spec:',
          '  podTemplate:',
          '    spec:',
          '      containers:',
          '        - name: c',
          '          image: busybox',
        ].join('\n'),
    });
    global.fetch = fetchMock;

    const sandbox = await fetchSampleSandbox(INDEX_URL, sample);

    expect(fetchMock).toHaveBeenCalledWith(
      './registry/sandbox/hello-world.yaml',
      expect.anything(),
    );
    expect(sandbox.spec.podTemplate.spec.containers[0].image).toBe('busybox');
  });

  it('points at the prepare script when the manifest is missing', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });

    await expect(fetchSampleSandbox(INDEX_URL, sample)).rejects.toThrow(/samples:prepare/);
  });
});

describe('fetchSampleManifest', () => {
  const originalFetch = global.fetch;
  const sample: SandboxSample = {
    id: 'hello-world',
    displayName: 'Hello World',
    tags: [],
    filename: 'hello-world.yaml',
  };

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns the YAML as served, without parsing it', async () => {
    // The preview shows the file; a manifest the browser cannot parse is
    // exactly the one worth looking at.
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => 'not: [valid' });

    await expect(fetchSampleManifest(INDEX_URL, sample)).resolves.toBe('not: [valid');
  });

  it('reports a manifest that cannot be read', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });

    await expect(fetchSampleManifest(INDEX_URL, sample)).rejects.toThrow(SandboxClientError);
  });
});
