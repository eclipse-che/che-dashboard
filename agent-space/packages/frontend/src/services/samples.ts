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

import { load } from 'js-yaml';

import { Sandbox, SANDBOX_KIND, SandboxClientError } from '@/services/types';

/**
 * One entry of `registry/sandbox/index.json`, produced by
 * `scripts/prepare-samples.sh`.
 */
export interface SandboxSample {
  id: string;
  displayName: string;
  description?: string;
  tags: string[];
  icon?: string;
  /** Caveats a user has to know before creating the sandbox, e.g. prerequisites. */
  notes?: string;
  /** Manifest file name, relative to index.json. */
  filename: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

/**
 * Keeps only the entries that carry enough information to be rendered and
 * created. A half-written index entry should hide one card, not break the page.
 */
export function parseSamplesIndex(raw: unknown): SandboxSample[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const samples: SandboxSample[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) {
      continue;
    }
    const id = asString(entry['id']);
    const displayName = asString(entry['displayName']);
    if (!id || !displayName) {
      continue;
    }

    const manifest = entry['manifest'];
    // prepare-samples.sh writes a deterministic `<id>.yaml`; fall back to it so
    // a checkout where the index was not regenerated still resolves.
    const filename =
      (isRecord(manifest) ? asString(manifest['filename']) : undefined) ?? `${id}.yaml`;

    samples.push({
      id,
      displayName,
      description: asString(entry['description']),
      tags: asStringArray(entry['tags']),
      icon: asString(entry['icon']),
      notes: asString(entry['notes']),
      filename,
    });
  }

  return samples;
}

function resolveSibling(indexUrl: string, filename: string): string {
  const base = indexUrl.replace(/[^/]*$/, '');
  return `${base}${filename}`;
}

/**
 * Where the card icon is served from.
 *
 * The index records it against the registry root - the parent of the samples
 * directory - so `/images/sandbox.svg` is the file the registry ships, not a
 * path on the host serving the dashboard.
 */
export function resolveSampleIcon(indexUrl: string, sample: SandboxSample): string | undefined {
  if (sample.icon === undefined) {
    return undefined;
  }
  if (/^(https?:)?\/\//.test(sample.icon) || sample.icon.startsWith('data:')) {
    return sample.icon;
  }
  const samplesDir = indexUrl.replace(/[^/]*$/, '');
  const registryRoot = samplesDir.replace(/[^/]*\/$/, '');
  return `${registryRoot}${sample.icon.replace(/^\//, '')}`;
}

export async function fetchSamples(indexUrl: string): Promise<SandboxSample[]> {
  const response = await fetch(indexUrl, { cache: 'no-cache' });
  if (!response.ok) {
    throw new SandboxClientError(
      response.status,
      `Failed to load the samples index from '${indexUrl}'.`,
    );
  }
  return parseSamplesIndex(await response.json());
}

/**
 * Narrows a parsed YAML document to a Sandbox. The manifests come from an
 * external repository, so the shape is checked rather than assumed.
 */
export function toSandbox(parsed: unknown, sampleId: string): Sandbox {
  if (!isRecord(parsed)) {
    throw new SandboxClientError(0, `Sample '${sampleId}' is not a YAML document.`);
  }
  if (parsed['kind'] !== SANDBOX_KIND) {
    throw new SandboxClientError(
      0,
      `Sample '${sampleId}' declares kind '${String(parsed['kind'])}', expected '${SANDBOX_KIND}'.`,
    );
  }

  const metadata = parsed['metadata'];
  const spec = parsed['spec'];
  if (!isRecord(metadata) || !asString(metadata['name'])) {
    throw new SandboxClientError(0, `Sample '${sampleId}' has no metadata.name.`);
  }
  if (!isRecord(spec) || !isRecord(spec['podTemplate'])) {
    throw new SandboxClientError(0, `Sample '${sampleId}' has no spec.podTemplate.`);
  }

  return parsed as unknown as Sandbox;
}

/**
 * The manifest as it is served from the registry, for the preview. The copy
 * next to `index.json` is the one a sandbox is created from, so it is also the
 * one worth reading - the upstream repository may have moved on since.
 */
export async function fetchSampleManifest(
  indexUrl: string,
  sample: SandboxSample,
): Promise<string> {
  const url = resolveSibling(indexUrl, sample.filename);
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) {
    throw new SandboxClientError(
      response.status,
      `Failed to load the manifest of '${sample.displayName}' from '${url}'. ` +
        'Run `yarn samples:prepare` to download the sample manifests.',
    );
  }
  return response.text();
}

export async function fetchSampleSandbox(
  indexUrl: string,
  sample: SandboxSample,
): Promise<Sandbox> {
  return toSandbox(load(await fetchSampleManifest(indexUrl, sample)), sample.id);
}
