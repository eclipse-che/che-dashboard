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
  ACTION_LABELS,
  buildActionPatch,
  canEditAiTools,
  findBlockingCondition,
  findCondition,
  formatResourceLimits,
  getAiToolsDisabledReason,
  getAvailableActions,
  getSandboxAiProviderIds,
  getSandboxAiVersions,
  getSandboxImages,
  getSandboxOriginalManifest,
  getSandboxPhase,
  getSandboxRuntimeClass,
  isTerminal,
  isTransitioning,
} from '@/services/sandbox';
import {
  AI_PROVIDERS_ANNOTATION,
  AI_VERSIONS_ANNOTATION,
  ORIGINAL_MANIFEST_ANNOTATION,
} from '@/services/sandboxFactory';
import { Sandbox, SandboxCondition, SandboxPhase } from '@/services/types';

function buildSandbox(overrides: Partial<Sandbox> = {}): Sandbox {
  return {
    metadata: { name: 'test', namespace: 'user-ns' },
    spec: {
      podTemplate: {
        spec: {
          containers: [{ name: 'agent', image: 'quay.io/example/agent:1' }],
        },
      },
    },
    ...overrides,
  };
}

function ready(status: SandboxCondition['status'], reason?: string): SandboxCondition[] {
  return [{ type: 'Ready', status, reason }];
}

describe('getSandboxPhase', () => {
  it('reports TERMINATING when the object is being deleted', () => {
    const sandbox = buildSandbox({
      metadata: { name: 'test', deletionTimestamp: '2025-01-01T00:00:00Z' },
      status: { conditions: ready('True') },
    });

    expect(getSandboxPhase(sandbox)).toBe(SandboxPhase.TERMINATING);
  });

  it('reports SUSPENDED when the operating mode asks for it', () => {
    const sandbox = buildSandbox();
    sandbox.spec.operatingMode = 'Suspended';

    expect(getSandboxPhase(sandbox)).toBe(SandboxPhase.SUSPENDED);
  });

  it('reports SUSPENDED while the pod is still going away', () => {
    const sandbox = buildSandbox({
      status: {
        conditions: [
          { type: 'Ready', status: 'False', reason: 'SandboxSuspended' },
          { type: 'Suspended', status: 'True', reason: 'PodTerminated' },
        ],
      },
    });

    expect(getSandboxPhase(sandbox)).toBe(SandboxPhase.SUSPENDED);
  });

  it('reports COMPLETED once the pod has run to completion', () => {
    const sandbox = buildSandbox({
      status: {
        conditions: [
          { type: 'Ready', status: 'False', reason: 'PodSucceeded' },
          { type: 'Finished', status: 'True', reason: 'PodSucceeded' },
        ],
      },
    });

    expect(getSandboxPhase(sandbox)).toBe(SandboxPhase.COMPLETED);
  });

  it('reports FAILED when the pod finished badly', () => {
    const sandbox = buildSandbox({
      status: { conditions: [{ type: 'Finished', status: 'True', reason: 'PodFailed' }] },
    });

    expect(getSandboxPhase(sandbox)).toBe(SandboxPhase.FAILED);
  });

  it('reports EXPIRED when the shutdown time has passed', () => {
    const sandbox = buildSandbox({
      status: { conditions: ready('False', 'SandboxExpired') },
    });

    expect(getSandboxPhase(sandbox)).toBe(SandboxPhase.EXPIRED);
  });

  it('reports BLOCKED on a reason the controller will not retry', () => {
    const sandbox = buildSandbox({
      status: { conditions: ready('False', 'InvalidConfiguration') },
    });

    expect(getSandboxPhase(sandbox)).toBe(SandboxPhase.BLOCKED);
  });

  it('reports RUNNING when Ready is True', () => {
    const sandbox = buildSandbox({ status: { conditions: ready('True') } });

    expect(getSandboxPhase(sandbox)).toBe(SandboxPhase.RUNNING);
  });

  it('reports PENDING when Ready is False for a non-blocking reason', () => {
    const sandbox = buildSandbox({ status: { conditions: ready('False', 'NotSuspended') } });

    expect(getSandboxPhase(sandbox)).toBe(SandboxPhase.PENDING);
  });

  it('reports PENDING when only unrelated conditions are reported', () => {
    const sandbox = buildSandbox({
      status: { conditions: [{ type: 'PodScheduled', status: 'True' }] },
    });

    expect(getSandboxPhase(sandbox)).toBe(SandboxPhase.PENDING);
  });

  it('reports PENDING when the controller has not reconciled it yet', () => {
    expect(getSandboxPhase(buildSandbox())).toBe(SandboxPhase.PENDING);
  });

  it('prefers the deletion timestamp over the operating mode', () => {
    const sandbox = buildSandbox({
      metadata: { name: 'test', deletionTimestamp: '2025-01-01T00:00:00Z' },
    });
    sandbox.spec.operatingMode = 'Suspended';

    expect(getSandboxPhase(sandbox)).toBe(SandboxPhase.TERMINATING);
  });

  it('prefers a finished pod over the operating mode', () => {
    const sandbox = buildSandbox({
      status: { conditions: [{ type: 'Finished', status: 'True', reason: 'PodSucceeded' }] },
    });
    sandbox.spec.operatingMode = 'Suspended';

    expect(getSandboxPhase(sandbox)).toBe(SandboxPhase.COMPLETED);
  });
});

describe('isTransitioning', () => {
  it.each([
    [SandboxPhase.PENDING, true],
    [SandboxPhase.TERMINATING, true],
    [SandboxPhase.RUNNING, false],
    [SandboxPhase.SUSPENDED, false],
    [SandboxPhase.COMPLETED, false],
    [SandboxPhase.BLOCKED, false],
  ])('returns %s -> %s', (phase, expected) => {
    expect(isTransitioning(phase)).toBe(expected);
  });
});

describe('isTerminal', () => {
  it.each([
    [SandboxPhase.COMPLETED, true],
    [SandboxPhase.FAILED, true],
    [SandboxPhase.EXPIRED, true],
    [SandboxPhase.RUNNING, false],
    [SandboxPhase.SUSPENDED, false],
    [SandboxPhase.PENDING, false],
  ])('returns %s -> %s', (phase, expected) => {
    expect(isTerminal(phase)).toBe(expected);
  });
});

describe('findCondition / findBlockingCondition', () => {
  it('finds a condition by type', () => {
    const sandbox = buildSandbox({ status: { conditions: ready('True', 'SandboxReady') } });

    expect(findCondition(sandbox, 'Ready')?.reason).toBe('SandboxReady');
    expect(findCondition(sandbox, 'Missing')).toBeUndefined();
  });

  it('matches a blocking reason exactly, not as a substring', () => {
    expect(
      findBlockingCondition(
        buildSandbox({ status: { conditions: ready('False', 'MultiplePods') } }),
      )?.reason,
    ).toBe('MultiplePods');
    // A reason that merely contains one must not be read as that one.
    expect(
      findBlockingCondition(
        buildSandbox({ status: { conditions: ready('False', 'NoMultiplePodsFound') } }),
      ),
    ).toBeUndefined();
  });

  it('ignores a blocking reason reported on a True condition', () => {
    const sandbox = buildSandbox({ status: { conditions: ready('True', 'InvalidConfiguration') } });

    expect(findBlockingCondition(sandbox)).toBeUndefined();
  });

  it('reads the scheduler verdict off PodScheduled, where the controller writes it', () => {
    // The shape a real unschedulable sandbox carries: the cause is on
    // PodScheduled, and Ready only says the pod is not up yet.
    const sandbox = buildSandbox({
      status: {
        conditions: [
          { type: 'Suspended', status: 'False', reason: 'NotSuspended' },
          {
            type: 'PodScheduled',
            status: 'False',
            reason: 'Unschedulable',
            message: '0/1 nodes are available: 1 Insufficient memory.',
          },
          { type: 'Ready', status: 'False', reason: 'DependenciesNotReady' },
        ],
      },
    });

    expect(findBlockingCondition(sandbox)?.type).toBe('PodScheduled');
    expect(getSandboxPhase(sandbox)).toBe(SandboxPhase.BLOCKED);
  });

  it('does not call a scheduling decision the controller has not made a block', () => {
    const sandbox = buildSandbox({
      status: {
        conditions: [{ type: 'PodScheduled', status: 'False', reason: 'PodSchedulingUnknown' }],
      },
    });

    expect(findBlockingCondition(sandbox)).toBeUndefined();
    expect(getSandboxPhase(sandbox)).toBe(SandboxPhase.PENDING);
  });

  it('treats a failed pod as blocking', () => {
    const sandbox = buildSandbox({
      status: { conditions: [{ type: 'Finished', status: 'True', reason: 'PodFailed' }] },
    });

    expect(findBlockingCondition(sandbox)?.type).toBe('Finished');
  });

  it('does not treat a waiting sandbox as blocked', () => {
    const sandbox = buildSandbox({ status: { conditions: ready('False', 'NotSuspended') } });

    expect(findBlockingCondition(sandbox)).toBeUndefined();
  });
});

describe('getAvailableActions', () => {
  it('offers suspend while running', () => {
    expect(getAvailableActions(SandboxPhase.RUNNING)).toEqual(['suspend']);
  });

  it('offers suspend while the sandbox is still coming up or stuck', () => {
    expect(getAvailableActions(SandboxPhase.PENDING)).toEqual(['suspend']);
    expect(getAvailableActions(SandboxPhase.BLOCKED)).toEqual(['suspend']);
  });

  it('offers resume for a suspended sandbox', () => {
    expect(getAvailableActions(SandboxPhase.SUSPENDED)).toEqual(['resume']);
  });

  it('offers restart for a failed sandbox', () => {
    // Nothing recreates the pod on its own under `restartPolicy: Never`, so
    // without this the only way out is deleting the sandbox.
    expect(getAvailableActions(SandboxPhase.FAILED)).toEqual(['restart']);
  });

  it('offers nothing once the sandbox has finished the work it was given', () => {
    expect(getAvailableActions(SandboxPhase.COMPLETED)).toEqual([]);
    expect(getAvailableActions(SandboxPhase.EXPIRED)).toEqual([]);
  });

  it('offers nothing while terminating', () => {
    expect(getAvailableActions(SandboxPhase.TERMINATING)).toEqual([]);
  });

  it('has a label for every action it offers', () => {
    const actions = Object.values(SandboxPhase).flatMap(phase => getAvailableActions(phase));

    actions.forEach(action => expect(ACTION_LABELS[action]).toBeTruthy());
  });
});

describe('canEditAiTools', () => {
  it('allows the edit exactly where a next pod is still coming', () => {
    // The injector runs as the pod starts, so Resume and Restart are the only
    // two actions that can carry a new selection into the sandbox.
    expect(canEditAiTools(SandboxPhase.SUSPENDED)).toBe(true);
    expect(canEditAiTools(SandboxPhase.FAILED)).toBe(true);
  });

  it('refuses while the pod the edit would have to change is already there', () => {
    // A Pod is immutable apart from its container images: the injector, its
    // volume and its API key cannot be added to one that exists.
    expect(canEditAiTools(SandboxPhase.RUNNING)).toBe(false);
    expect(canEditAiTools(SandboxPhase.PENDING)).toBe(false);
    expect(canEditAiTools(SandboxPhase.BLOCKED)).toBe(false);
  });

  it('refuses where no pod will ever follow', () => {
    expect(canEditAiTools(SandboxPhase.COMPLETED)).toBe(false);
    expect(canEditAiTools(SandboxPhase.EXPIRED)).toBe(false);
    expect(canEditAiTools(SandboxPhase.TERMINATING)).toBe(false);
  });
});

describe('getAiToolsDisabledReason', () => {
  it('says nothing when the edit would land', () => {
    expect(getAiToolsDisabledReason(SandboxPhase.SUSPENDED)).toBeUndefined();
    expect(getAiToolsDisabledReason(SandboxPhase.FAILED)).toBeUndefined();
  });

  it('points at the suspend that would make the edit possible', () => {
    expect(getAiToolsDisabledReason(SandboxPhase.RUNNING)).toContain('Suspend the sandbox');
    expect(getAiToolsDisabledReason(SandboxPhase.PENDING)).toContain('Suspend the sandbox');
    expect(getAiToolsDisabledReason(SandboxPhase.BLOCKED)).toContain('Suspend the sandbox');
  });

  it('says so plainly where there is no way back', () => {
    expect(getAiToolsDisabledReason(SandboxPhase.COMPLETED)).toContain('will not start again');
    expect(getAiToolsDisabledReason(SandboxPhase.EXPIRED)).toContain('will not start again');
    expect(getAiToolsDisabledReason(SandboxPhase.TERMINATING)).toContain('will not start again');
  });
});

describe('buildActionPatch', () => {
  it('suspends through the operating mode', () => {
    expect(buildActionPatch('suspend')).toEqual({ spec: { operatingMode: 'Suspended' } });
  });

  it('resumes through the operating mode', () => {
    expect(buildActionPatch('resume')).toEqual({ spec: { operatingMode: 'Running' } });
  });

  it('round-trips through getSandboxPhase', () => {
    const sandbox = buildSandbox();
    Object.assign(sandbox.spec, buildActionPatch('suspend').spec);
    expect(getSandboxPhase(sandbox)).toBe(SandboxPhase.SUSPENDED);

    Object.assign(sandbox.spec, buildActionPatch('resume').spec);
    expect(getSandboxPhase(sandbox)).toBe(SandboxPhase.PENDING);
  });
});

describe('spec accessors', () => {
  it('lists the container images', () => {
    expect(getSandboxImages(buildSandbox())).toEqual(['quay.io/example/agent:1']);
  });

  it('returns the runtime class when set', () => {
    const sandbox = buildSandbox();
    sandbox.spec.podTemplate.spec.runtimeClassName = 'gvisor';

    expect(getSandboxRuntimeClass(sandbox)).toBe('gvisor');
    expect(getSandboxRuntimeClass(buildSandbox())).toBeUndefined();
  });

  it('formats the resource limits of all containers', () => {
    const sandbox = buildSandbox();
    sandbox.spec.podTemplate.spec.containers[0].resources = {
      limits: { cpu: '2', memory: '4Gi', 'ephemeral-storage': '10Gi' },
    };

    expect(formatResourceLimits(sandbox)).toBe('cpu: 2, memory: 4Gi, storage: 10Gi');
  });

  it('falls back to a dash when no limits are set', () => {
    expect(formatResourceLimits(buildSandbox())).toBe('-');
  });
});

describe('annotation accessors', () => {
  function annotated(annotations: Record<string, string>): Sandbox {
    return buildSandbox({ metadata: { name: 'test', namespace: 'user-ns', annotations } });
  }

  it('reads back what the factory recorded', () => {
    const sandbox = annotated({
      [AI_PROVIDERS_ANNOTATION]: 'anthropic,openai',
      [AI_VERSIONS_ANNOTATION]: 'anthropic=next,openai=1.0.0',
      [ORIGINAL_MANIFEST_ANNOTATION]: 'kind: Sandbox\n',
    });

    expect(getSandboxAiProviderIds(sandbox)).toEqual(['anthropic', 'openai']);
    expect(getSandboxAiVersions(sandbox)).toEqual({ anthropic: 'next', openai: '1.0.0' });
    expect(getSandboxOriginalManifest(sandbox)).toBe('kind: Sandbox\n');
  });

  it('reports nothing for a sandbox the dashboard did not create', () => {
    const sandbox = buildSandbox();

    expect(getSandboxAiProviderIds(sandbox)).toEqual([]);
    expect(getSandboxAiVersions(sandbox)).toEqual({});
    expect(getSandboxOriginalManifest(sandbox)).toBeUndefined();
  });

  it('ignores an empty provider list rather than reporting a blank agent', () => {
    expect(getSandboxAiProviderIds(annotated({ [AI_PROVIDERS_ANNOTATION]: '' }))).toEqual([]);
    expect(getSandboxAiProviderIds(annotated({ [AI_PROVIDERS_ANNOTATION]: 'anthropic,' }))).toEqual(
      ['anthropic'],
    );
  });

  it('keeps a provider id that has an equals sign of its own', () => {
    expect(
      getSandboxAiVersions(annotated({ [AI_VERSIONS_ANNOTATION]: 'vendor/tool=1=2' })),
    ).toEqual({ 'vendor/tool=1': '2' });
  });

  it('drops a version entry with nothing on one side of the equals sign', () => {
    expect(
      getSandboxAiVersions(annotated({ [AI_VERSIONS_ANNOTATION]: '=next,anthropic=,openai=1' })),
    ).toEqual({ openai: '1' });
  });
});
