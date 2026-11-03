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

import { AiToolDefinition } from '@/services/catalog';
import {
  AI_PROVIDERS_ANNOTATION,
  AI_VERSIONS_ANNOTATION,
  applyCustomization,
  applySampleOverrides,
  buildAiToolsPatch,
  buildSandbox,
  DEFAULT_FORM_DATA,
  INJECTED_TOOLS_PATH,
  INJECTED_TOOLS_VOLUME,
  isFormValid,
  KEEP_ALIVE_COMMAND,
  NO_CUSTOMIZATION,
  ORIGINAL_MANIFEST_ANNOTATION,
  SANDBOX_POD_LABEL,
  SandboxFormData,
  toAiKeySecretName,
  validateCpu,
  validateForm,
  validateImage,
  validateMemory,
  validateName,
  withOriginalManifest,
} from '@/services/sandboxFactory';
import { Sandbox, SANDBOX_API_VERSION_FULL, SANDBOX_KIND } from '@/services/types';

function formData(overrides: Partial<SandboxFormData> = {}): SandboxFormData {
  return { ...DEFAULT_FORM_DATA, name: 'my-agent', ...overrides };
}

function aiTool(overrides: Partial<AiToolDefinition> = {}): AiToolDefinition {
  return {
    providerId: 'anthropic',
    tag: 'latest',
    name: 'Claude Code',
    url: 'https://example.com',
    binary: 'claude',
    pattern: 'init',
    injectorImage: 'quay.io/example/claude-code:next',
    envVarName: 'ANTHROPIC_API_KEY',
    ...overrides,
  };
}

const TOOLS = [
  aiTool(),
  aiTool({
    providerId: 'openai',
    name: 'Codex',
    binary: 'codex',
    injectorImage: 'quay.io/example/codex-cli:latest',
    envVarName: 'OPENAI_API_KEY',
  }),
];

describe('validateName', () => {
  it('requires a name', () => {
    expect(validateName('')).toBe('Name is required.');
  });

  it('rejects names longer than 63 characters', () => {
    expect(validateName('a'.repeat(64))).toContain('63 characters');
  });

  it.each(['My-Agent', 'agent_1', '-agent', 'agent-', 'agent.1'])('rejects %s', name => {
    expect(validateName(name)).toBeDefined();
  });

  it.each(['a', 'my-agent', 'agent1', 'a1-b2-c3'])('accepts %s', name => {
    expect(validateName(name)).toBeUndefined();
  });
});

describe('validateImage', () => {
  it('requires an image', () => {
    expect(validateImage('   ')).toBe('Container image is required.');
  });

  it('rejects an image containing whitespace', () => {
    expect(validateImage('quay.io/foo bar:1')).toContain('whitespace');
  });

  it('accepts a normal image reference', () => {
    expect(validateImage('quay.io/example/agent:1.2.3')).toBeUndefined();
  });
});

describe('validateCpu / validateMemory', () => {
  it.each(['1', '2.5', '500m'])('accepts the CPU quantity %s', value => {
    expect(validateCpu(value)).toBeUndefined();
  });

  it.each(['1 cpu', 'abc', '500M'])('rejects the CPU quantity %s', value => {
    expect(validateCpu(value)).toBeDefined();
  });

  it.each(['2Gi', '512Mi', '1024', '1G'])('accepts the memory quantity %s', value => {
    expect(validateMemory(value)).toBeUndefined();
  });

  it.each(['2 GB', 'lots'])('rejects the memory quantity %s', value => {
    expect(validateMemory(value)).toBeDefined();
  });

  it('treats an empty limit as "no limit" rather than an error', () => {
    expect(validateCpu('')).toBeUndefined();
    expect(validateMemory('')).toBeUndefined();
  });
});

describe('toAiKeySecretName', () => {
  it('builds the same secret name the dashboard backend writes', () => {
    expect(toAiKeySecretName('ANTHROPIC_API_KEY')).toBe('ai-provider-anthropic-api-key');
  });
});

describe('validateForm', () => {
  it('reports every field that is wrong at once', () => {
    expect(validateForm(formData({ name: '', image: '', cpuLimit: 'two' }))).toEqual({
      name: 'Name is required.',
      image: 'Container image is required.',
      cpuLimit: expect.stringContaining('Kubernetes quantity'),
    });
  });

  it('reports nothing for a form that is filled in', () => {
    expect(validateForm(formData())).toEqual({});
  });
});

describe('isFormValid', () => {
  it('rejects the pristine form because it has no name', () => {
    expect(isFormValid(DEFAULT_FORM_DATA)).toBe(false);
  });

  it('accepts a filled-in form', () => {
    expect(isFormValid(formData())).toBe(true);
  });
});

describe('buildSandbox', () => {
  it('builds a Sandbox for the given namespace', () => {
    const sandbox = buildSandbox(formData(), 'user-ns');

    expect(sandbox.apiVersion).toBe(SANDBOX_API_VERSION_FULL);
    expect(sandbox.kind).toBe(SANDBOX_KIND);
    expect(sandbox.metadata).toEqual({ name: 'my-agent', namespace: 'user-ns' });
  });

  it('labels the pod so anything addressing it can find it', () => {
    const sandbox = buildSandbox(formData(), 'user-ns');

    expect(sandbox.spec.podTemplate.metadata?.labels).toEqual({
      [SANDBOX_POD_LABEL]: 'my-agent',
    });
  });

  it('mirrors the limits into requests so the pod schedules under a LimitRange', () => {
    const sandbox = buildSandbox(formData({ cpuLimit: '2', memoryLimit: '4Gi' }), 'user-ns');

    expect(sandbox.spec.podTemplate.spec.containers[0].resources).toEqual({
      limits: { cpu: '2', memory: '4Gi' },
      requests: { cpu: '2', memory: '4Gi' },
    });
  });

  it('omits resources entirely when no limit is given', () => {
    const sandbox = buildSandbox(formData({ cpuLimit: '', memoryLimit: '' }), 'user-ns');

    expect(sandbox.spec.podTemplate.spec.containers[0].resources).toBeUndefined();
  });

  it('omits the runtime class when the cluster default is selected', () => {
    const sandbox = buildSandbox(formData({ runtimeClassName: '' }), 'user-ns');

    expect(sandbox.spec.podTemplate.spec.runtimeClassName).toBeUndefined();
  });

  it('sets the runtime class when one is selected', () => {
    const sandbox = buildSandbox(formData({ runtimeClassName: 'gvisor' }), 'user-ns');

    expect(sandbox.spec.podTemplate.spec.runtimeClassName).toBe('gvisor');
  });

  it('does not mount a service account token into the agent', () => {
    const sandbox = buildSandbox(formData(), 'user-ns');

    expect(sandbox.spec.podTemplate.spec.automountServiceAccountToken).toBe(false);
  });

  it('trims the user input', () => {
    const sandbox = buildSandbox(
      formData({ name: '  my-agent  ', image: '  quay.io/a/b:1  ', command: '  sleep 1  ' }),
      'user-ns',
    );

    expect(sandbox.metadata.name).toBe('my-agent');
    expect(sandbox.spec.podTemplate.spec.containers[0].image).toBe('quay.io/a/b:1');
    expect(sandbox.spec.podTemplate.spec.containers[0].command).toEqual([
      '/bin/sh',
      '-c',
      'sleep 1',
    ]);
  });

  describe('the command', () => {
    it('keeps the container alive by default, which the pod needs to stay up', () => {
      const sandbox = buildSandbox(formData(), 'user-ns');

      expect(sandbox.spec.podTemplate.spec.containers[0].command).toEqual([
        '/bin/sh',
        '-c',
        KEEP_ALIVE_COMMAND,
      ]);
    });

    it('runs what the user typed, through a shell', () => {
      const sandbox = buildSandbox(formData({ command: 'serve --port 8080' }), 'user-ns');

      expect(sandbox.spec.podTemplate.spec.containers[0].command).toEqual([
        '/bin/sh',
        '-c',
        'serve --port 8080',
      ]);
    });

    it('leaves the image entrypoint in charge when the field is cleared', () => {
      const sandbox = buildSandbox(formData({ command: '' }), 'user-ns');

      expect(sandbox.spec.podTemplate.spec.containers[0].command).toBeUndefined();
    });
  });

  describe('the AI agents', () => {
    it('injects one init container per selected provider', () => {
      const sandbox = buildSandbox(
        formData({ aiProviderIds: ['anthropic', 'openai'] }),
        'user-ns',
        TOOLS,
      );

      expect(sandbox.spec.podTemplate.spec.initContainers?.map(c => c.name)).toEqual([
        'claude-code-injector',
        'codex-cli-injector',
      ]);
      expect(sandbox.metadata.annotations).toEqual({
        [AI_PROVIDERS_ANNOTATION]: 'anthropic,openai',
        [AI_VERSIONS_ANNOTATION]: 'anthropic=latest,openai=latest',
      });
    });

    it('records nothing when no agent was picked', () => {
      expect(buildSandbox(formData(), 'user-ns', TOOLS).metadata.annotations).toBeUndefined();
    });

    it('shares the injected CLIs with the agent through a volume on the PATH', () => {
      const sandbox = buildSandbox(formData({ aiProviderIds: ['anthropic'] }), 'user-ns', TOOLS);
      const { spec } = sandbox.spec.podTemplate;

      // Alongside whatever the chosen storage type contributes.
      expect(spec.volumes).toContainEqual({
        name: INJECTED_TOOLS_VOLUME,
        emptyDir: { sizeLimit: '512Mi' },
      });
      expect(spec.containers[0].volumeMounts).toContainEqual({
        name: INJECTED_TOOLS_VOLUME,
        mountPath: INJECTED_TOOLS_PATH,
      });
      expect(spec.containers[0].env).toContainEqual({
        name: 'PATH',
        value: `${INJECTED_TOOLS_PATH}/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`,
      });
    });

    it('reads the API key from the secret the dashboard writes, if there is one', () => {
      const sandbox = buildSandbox(formData({ aiProviderIds: ['anthropic'] }), 'user-ns', TOOLS);

      expect(sandbox.spec.podTemplate.spec.containers[0].env).toContainEqual({
        name: 'ANTHROPIC_API_KEY',
        valueFrom: {
          secretKeyRef: {
            name: 'ai-provider-anthropic-api-key',
            key: 'ANTHROPIC_API_KEY',
            optional: true,
          },
        },
      });
    });

    it('asks for no key when the tool needs none', () => {
      const sandbox = buildSandbox(formData({ aiProviderIds: ['local'] }), 'user-ns', [
        aiTool({ providerId: 'local', envVarName: undefined }),
      ]);

      expect(sandbox.spec.podTemplate.spec.containers[0].env).toEqual([
        expect.objectContaining({ name: 'PATH' }),
      ]);
    });

    it('takes the tag the user picked for a provider that ships several', () => {
      const sandbox = buildSandbox(
        formData({ aiProviderIds: ['anthropic'], aiVersions: { anthropic: 'next' } }),
        'user-ns',
        [aiTool(), aiTool({ tag: 'next', injectorImage: 'quay.io/example/claude-code:1.2' })],
      );

      expect(sandbox.metadata.annotations?.[AI_VERSIONS_ANNOTATION]).toBe('anthropic=next');
      expect(sandbox.spec.podTemplate.spec.initContainers?.[0].image).toBe(
        'quay.io/example/claude-code:1.2',
      );
    });

    it('copies the binary for an init-pattern tool', () => {
      const [injector] =
        buildSandbox(formData({ aiProviderIds: ['anthropic'] }), 'user-ns', TOOLS).spec.podTemplate
          .spec.initContainers ?? [];

      expect(injector.image).toBe('quay.io/example/claude-code:next');
      expect(injector.args?.join('')).toContain('cp /usr/local/bin/claude');
      expect(injector.volumeMounts).toEqual([
        { name: INJECTED_TOOLS_VOLUME, mountPath: INJECTED_TOOLS_PATH },
      ]);
    });

    it('links the bundle into bin for a bundle-pattern tool', () => {
      const [injector] =
        buildSandbox(formData({ aiProviderIds: ['anthropic'] }), 'user-ns', [
          aiTool({ pattern: 'bundle' }),
        ]).spec.podTemplate.spec.initContainers ?? [];

      expect(injector.args?.join('')).toContain('cp -a /opt/claude-code/.');
      expect(injector.args?.join('')).toContain(
        `ln -sf ${INJECTED_TOOLS_PATH}/claude-code/bin/claude`,
      );
    });

    it('injects nothing when the catalogue has no tool for the provider', () => {
      const sandbox = buildSandbox(formData({ aiProviderIds: ['gone'] }), 'user-ns', TOOLS);

      expect(sandbox.spec.podTemplate.spec.initContainers).toBeUndefined();
      expect(
        sandbox.spec.podTemplate.spec.volumes?.some(
          volume => volume.name === INJECTED_TOOLS_VOLUME,
        ),
      ).toBe(false);
      expect(sandbox.spec.podTemplate.spec.containers[0].env).toBeUndefined();
    });
  });
});

describe('applyCustomization', () => {
  /** A sample as published: its own PATH, its own volume, its own init container. */
  function sample(): Sandbox {
    return {
      apiVersion: SANDBOX_API_VERSION_FULL,
      kind: SANDBOX_KIND,
      metadata: { name: 'hello-world', namespace: 'user-ns' },
      spec: {
        podTemplate: {
          spec: {
            initContainers: [{ name: 'warm-up', image: 'busybox' }],
            containers: [
              {
                name: 'agent',
                image: 'busybox',
                env: [{ name: 'PATH', value: '/opt/tools/bin:/usr/bin' }],
                volumeMounts: [{ name: 'work', mountPath: '/work' }],
              },
            ],
            volumes: [{ name: 'work', emptyDir: {} }],
          },
        },
      },
    };
  }

  it('keeps the injected CLIs in front of the PATH the sample set', () => {
    const sandbox = applyCustomization(sample(), { aiProviderIds: ['anthropic'] }, TOOLS);

    expect(sandbox.spec.podTemplate.spec.containers[0].env).toContainEqual({
      name: 'PATH',
      value: `${INJECTED_TOOLS_PATH}/bin:/opt/tools/bin:/usr/bin`,
    });
  });

  it('leaves what the sample declared alone', () => {
    const sandbox = applyCustomization(sample(), { aiProviderIds: ['anthropic'] }, TOOLS);
    const { spec } = sandbox.spec.podTemplate;

    expect(spec.initContainers?.map(c => c.name)).toEqual(['warm-up', 'claude-code-injector']);
    expect(spec.volumes?.map(v => v.name)).toEqual(['work', INJECTED_TOOLS_VOLUME]);
    expect(spec.containers[0].volumeMounts?.map(m => m.name)).toEqual([
      'work',
      INJECTED_TOOLS_VOLUME,
    ]);
  });

  it('does not mutate its argument', () => {
    const original = sample();
    applyCustomization(original, { aiProviderIds: ['anthropic'] }, TOOLS);

    expect(original.spec.podTemplate.spec.initContainers).toEqual([
      { name: 'warm-up', image: 'busybox' },
    ]);
    expect(original.metadata.annotations).toBeUndefined();
  });

  describe('changing a selection that is already there', () => {
    const withAnthropic = () =>
      applyCustomization(sample(), { aiProviderIds: ['anthropic'] }, TOOLS);

    it('replaces the previous agent rather than stacking a second one', () => {
      const sandbox = applyCustomization(withAnthropic(), { aiProviderIds: ['openai'] }, TOOLS);
      const { spec } = sandbox.spec.podTemplate;

      expect(spec.initContainers?.map(c => c.name)).toEqual(['warm-up', 'codex-cli-injector']);
      expect(spec.volumes?.filter(v => v.name === INJECTED_TOOLS_VOLUME)).toHaveLength(1);
      expect(spec.containers[0].env?.map(e => e.name)).toEqual(['OPENAI_API_KEY', 'PATH']);
      expect(sandbox.metadata.annotations).toEqual({
        [AI_PROVIDERS_ANNOTATION]: 'openai',
        [AI_VERSIONS_ANNOTATION]: 'openai=latest',
      });
    });

    it('puts the pod back as the sample had it when every agent is deselected', () => {
      const sandbox = applyCustomization(withAnthropic(), NO_CUSTOMIZATION, TOOLS);

      expect(sandbox.spec.podTemplate.spec).toEqual(sample().spec.podTemplate.spec);
      expect(sandbox.metadata.annotations).toBeUndefined();
    });

    it('keeps the annotations the sandbox carries for other reasons', () => {
      const kept = withOriginalManifest(withAnthropic(), 'kind: Sandbox');
      const sandbox = applyCustomization(kept, NO_CUSTOMIZATION, TOOLS);

      expect(sandbox.metadata.annotations).toEqual({
        [ORIGINAL_MANIFEST_ANNOTATION]: 'kind: Sandbox',
      });
    });

    it('drops the PATH entry entirely when there was none to begin with', () => {
      const bare: Sandbox = {
        apiVersion: SANDBOX_API_VERSION_FULL,
        kind: SANDBOX_KIND,
        metadata: { name: 'bare', namespace: 'user-ns' },
        spec: { podTemplate: { spec: { containers: [{ name: 'agent', image: 'busybox' }] } } },
      };
      const injected = applyCustomization(bare, { aiProviderIds: ['anthropic'] }, TOOLS);
      const sandbox = applyCustomization(injected, NO_CUSTOMIZATION, TOOLS);

      expect(sandbox.spec.podTemplate.spec).toEqual(bare.spec.podTemplate.spec);
    });
  });

  it('survives a manifest whose pod declares no container at all', () => {
    const empty: Sandbox = {
      apiVersion: SANDBOX_API_VERSION_FULL,
      kind: SANDBOX_KIND,
      metadata: { name: 'empty', namespace: 'user-ns' },
      spec: { podTemplate: { spec: { containers: [] } } },
    };

    expect(() => applyCustomization(empty, { aiProviderIds: ['anthropic'] }, TOOLS)).not.toThrow();
  });
});

describe('buildAiToolsPatch', () => {
  const sandbox: Sandbox = {
    apiVersion: SANDBOX_API_VERSION_FULL,
    kind: SANDBOX_KIND,
    metadata: { name: 'hello-world', namespace: 'user-ns' },
    spec: { podTemplate: { spec: { containers: [{ name: 'agent', image: 'busybox' }] } } },
  };

  it('sends the pod template whole, because a merge patch cannot shorten a list', () => {
    const patch = buildAiToolsPatch(sandbox, { aiProviderIds: ['anthropic'] }, TOOLS);

    expect(patch.spec?.podTemplate?.spec.initContainers?.map(c => c.name)).toEqual([
      'claude-code-injector',
    ]);
    expect(patch.metadata?.annotations).toEqual({
      [AI_PROVIDERS_ANNOTATION]: 'anthropic',
      [AI_VERSIONS_ANNOTATION]: 'anthropic=latest',
    });
  });

  it('removes the annotations with a null when nothing is selected', () => {
    const withTools = applyCustomization(sandbox, { aiProviderIds: ['anthropic'] }, TOOLS);
    const patch = buildAiToolsPatch(withTools, NO_CUSTOMIZATION, TOOLS);

    expect(patch.metadata?.annotations).toEqual({
      [AI_PROVIDERS_ANNOTATION]: null,
      [AI_VERSIONS_ANNOTATION]: null,
    });
    expect(patch.spec?.podTemplate?.spec.initContainers).toBeUndefined();
  });

  it('leaves the volume claim templates out, which the CRD will not let change', () => {
    const patch = buildAiToolsPatch(sandbox, { aiProviderIds: ['anthropic'] }, TOOLS);

    expect(patch.spec).toEqual({ podTemplate: expect.anything() });
  });
});

describe('withOriginalManifest', () => {
  const sandbox: Sandbox = {
    apiVersion: SANDBOX_API_VERSION_FULL,
    kind: SANDBOX_KIND,
    metadata: { name: 'hello-world', namespace: 'user-ns', annotations: { keep: 'me' } },
    spec: { podTemplate: { spec: { containers: [] } } },
  };

  it('keeps the manifest beside the annotations that are already there', () => {
    expect(withOriginalManifest(sandbox, 'kind: Sandbox').metadata.annotations).toEqual({
      keep: 'me',
      [ORIGINAL_MANIFEST_ANNOTATION]: 'kind: Sandbox',
    });
  });

  it('does not mutate its argument', () => {
    withOriginalManifest(sandbox, 'kind: Sandbox');

    expect(sandbox.metadata.annotations).toEqual({ keep: 'me' });
  });
});

describe('applySampleOverrides', () => {
  const sample: Sandbox = {
    apiVersion: SANDBOX_API_VERSION_FULL,
    kind: SANDBOX_KIND,
    metadata: { name: 'hello-world', namespace: 'upstream-ns' },
    spec: { podTemplate: { spec: { containers: [{ name: 'c', image: 'busybox' }] } } },
  };

  it('moves the sample into the user namespace', () => {
    expect(applySampleOverrides(sample, 'user-ns').metadata).toEqual({
      name: 'hello-world',
      namespace: 'user-ns',
    });
  });

  it('allows overriding the name', () => {
    expect(applySampleOverrides(sample, 'user-ns', 'my-copy').metadata.name).toBe('my-copy');
  });

  it('keeps the sample name when the override is blank', () => {
    expect(applySampleOverrides(sample, 'user-ns', '  ').metadata.name).toBe('hello-world');
  });

  it('does not mutate the sample', () => {
    applySampleOverrides(sample, 'user-ns', 'my-copy');

    expect(sample.metadata.namespace).toBe('upstream-ns');
  });
});
