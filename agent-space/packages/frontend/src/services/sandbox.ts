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
  AI_PROVIDERS_ANNOTATION,
  AI_VERSIONS_ANNOTATION,
  ORIGINAL_MANIFEST_ANNOTATION,
} from '@/services/sandboxFactory';
import {
  Sandbox,
  SandboxAction,
  SandboxCondition,
  SandboxOperatingModeAction,
  SandboxPatch,
  SandboxPhase,
} from '@/services/types';

/**
 * The four condition types of `agents.x-k8s.io/v1beta1`. `Ready` is the
 * authoritative one for "is it up" - the API deliberately has no `Running`
 * condition - but it is not the only one that can explain a stuck sandbox:
 * the controller reports scheduling outcomes on `PodScheduled` instead.
 */
export const READY_CONDITION = 'Ready';
export const SUSPENDED_CONDITION = 'Suspended';
export const FINISHED_CONDITION = 'Finished';
export const POD_SCHEDULED_CONDITION = 'PodScheduled';

/**
 * `Ready=False` reasons that the user has to act on, as opposed to one the
 * controller expects to clear on its own (`DependenciesNotReady`) or one that
 * is already reported as a phase of its own (`SandboxSuspended`,
 * `SandboxExpired`, `PodSucceeded`, `PodFailed`).
 *
 * Taken from the reason constants the API defines. Pod-level reasons such as
 * `ImagePullBackOff` or `CrashLoopBackOff` deliberately do not appear here:
 * they live on the pod's container statuses and never reach a Sandbox
 * condition, so the Events tab is where the user sees them.
 */
const BLOCKED_READY_REASONS = ['ReconcilerError', 'MultiplePods', 'InvalidConfiguration'];

/** Reasons that explain a `Ready=False` as an end state rather than a wait. */
const REASON = {
  POD_SUCCEEDED: 'PodSucceeded',
  POD_FAILED: 'PodFailed',
  SUSPENDED: 'SandboxSuspended',
  EXPIRED: 'SandboxExpired',
  /** `PodScheduled` is not decided yet - a wait, not a refusal. */
  POD_SCHEDULING_UNKNOWN: 'PodSchedulingUnknown',
};

export function findCondition(sandbox: Sandbox, type: string): SandboxCondition | undefined {
  return sandbox.status?.conditions?.find(condition => condition.type === type);
}

function isTrue(condition: SandboxCondition | undefined): boolean {
  return condition?.status === 'True';
}

/** Exact match: `NotBlocked` is not `Blocked`, and reasons are API constants. */
function isBlockedReason(reason: string | undefined): boolean {
  return reason !== undefined && BLOCKED_READY_REASONS.includes(reason);
}

/**
 * The scheduler could not place the pod. The controller copies the pod's own
 * `PodScheduled` condition through unchanged, so the reason here is whatever
 * kube-scheduler wrote - `Unschedulable` in practice - rather than one of the
 * sandbox API's own constants. Matching on the status is therefore the only
 * reliable test; a reason allow-list would miss every real case.
 */
function isUnschedulable(condition: SandboxCondition): boolean {
  return (
    condition.type === POD_SCHEDULED_CONDITION &&
    condition.status === 'False' &&
    condition.reason !== REASON.POD_SCHEDULING_UNKNOWN
  );
}

/**
 * Returns the condition that explains why a sandbox is not running, if any.
 * Used for the inline error message on the list and details pages.
 *
 * A sandbox that merely has not started yet is not blocked: only a pod the
 * scheduler refused, a reason the user has to act on, and an outright pod
 * failure qualify.
 */
export function findBlockingCondition(sandbox: Sandbox): SandboxCondition | undefined {
  const conditions = sandbox.status?.conditions ?? [];
  return conditions.find(
    condition =>
      isUnschedulable(condition) ||
      (condition.type === READY_CONDITION &&
        condition.status === 'False' &&
        isBlockedReason(condition.reason)) ||
      (condition.type === FINISHED_CONDITION &&
        condition.status === 'True' &&
        condition.reason === REASON.POD_FAILED),
  );
}

/**
 * Folds spec and status into the single phase shown in the UI.
 *
 * The API publishes no phase field, and `Ready=False` alone says very little:
 * a sandbox whose pod ran to completion reports exactly the same status as one
 * that is still being scheduled. The reason behind the condition is therefore
 * what decides here, which is what keeps a finished sandbox from sitting on
 * 'Pending' forever.
 *
 * Order matters: deletion wins over everything, an explicitly suspended
 * sandbox is reported as such while its pod is still going away, and only
 * then do the conditions speak.
 */
export function getSandboxPhase(sandbox: Sandbox): SandboxPhase {
  if (sandbox.metadata.deletionTimestamp) {
    return SandboxPhase.TERMINATING;
  }

  const ready = findCondition(sandbox, READY_CONDITION);
  const finished = findCondition(sandbox, FINISHED_CONDITION);
  const suspended = findCondition(sandbox, SUSPENDED_CONDITION);

  // The pod is gone and nothing recreates it on its own. Restarting still
  // can, by suspending and resuming, which clears this condition again.
  if (isTrue(finished)) {
    return finished?.reason === REASON.POD_FAILED ? SandboxPhase.FAILED : SandboxPhase.COMPLETED;
  }

  if (sandbox.spec?.operatingMode === 'Suspended' || isTrue(suspended)) {
    return SandboxPhase.SUSPENDED;
  }

  if (isTrue(ready)) {
    return SandboxPhase.RUNNING;
  }

  switch (ready?.reason) {
    case REASON.EXPIRED:
      return SandboxPhase.EXPIRED;
    case REASON.POD_FAILED:
      return SandboxPhase.FAILED;
    case REASON.POD_SUCCEEDED:
      return SandboxPhase.COMPLETED;
    case REASON.SUSPENDED:
      return SandboxPhase.SUSPENDED;
  }

  if (findBlockingCondition(sandbox)) {
    return SandboxPhase.BLOCKED;
  }

  // Either the controller has not reconciled the object yet, or it says
  // Ready=False for a reason it expects to resolve on its own.
  return SandboxPhase.PENDING;
}

/** Phases the sandbox leaves on its own, without anyone asking it to. */
export function isTransitioning(phase: SandboxPhase): boolean {
  return phase === SandboxPhase.PENDING || phase === SandboxPhase.TERMINATING;
}

/** True once the sandbox has reached a state it will not leave again. */
export function isTerminal(phase: SandboxPhase): boolean {
  return (
    phase === SandboxPhase.COMPLETED ||
    phase === SandboxPhase.FAILED ||
    phase === SandboxPhase.EXPIRED
  );
}

export function getAvailableActions(phase: SandboxPhase): SandboxAction[] {
  switch (phase) {
    case SandboxPhase.RUNNING:
    case SandboxPhase.PENDING:
    case SandboxPhase.BLOCKED:
      return ['suspend'];
    case SandboxPhase.SUSPENDED:
      return ['resume'];
    case SandboxPhase.FAILED:
      // The pod will not come back on its own - it runs under
      // `restartPolicy: Never` - so this is the only way out short of
      // deleting the sandbox and creating it again.
      return ['restart'];
    default:
      // Terminating, and the terminal phases a restart would not help:
      // Completed finished the work it was asked to do, and Expired would
      // only run into its deadline again. Only Delete is left.
      return [];
  }
}

export const ACTION_LABELS: Record<SandboxAction, string> = {
  suspend: 'Suspend',
  resume: 'Resume',
  restart: 'Restart',
};

/**
 * Merge patch applied for each lifecycle action.
 *
 * `operatingMode` is the whole lifecycle API: suspending deletes the pod and
 * keeps the volumes, resuming recreates it and reattaches them. Restart is not
 * here because it is not one patch - see `restartSandbox` in the store.
 */
export function buildActionPatch(action: SandboxOperatingModeAction): SandboxPatch {
  return { spec: { operatingMode: action === 'suspend' ? 'Suspended' : 'Running' } };
}

export function getSandboxImages(sandbox: Sandbox): string[] {
  return (sandbox.spec?.podTemplate?.spec?.containers ?? []).map(container => container.image);
}

export function getSandboxRuntimeClass(sandbox: Sandbox): string | undefined {
  return sandbox.spec?.podTemplate?.spec?.runtimeClassName;
}

/** Providers whose agent CLI was injected into the sandbox. */
export function getSandboxAiProviderIds(sandbox: Sandbox): string[] {
  const value = sandbox.metadata?.annotations?.[AI_PROVIDERS_ANNOTATION];
  return value === undefined ? [] : value.split(',').filter(id => id.length > 0);
}

/**
 * The tag each injected agent was taken at, keyed by provider id.
 *
 * A sandbox created before the versions were recorded has no entry here, and
 * the selector then falls back to the first tool of the provider - the one it
 * would have injected at the time.
 */
export function getSandboxAiVersions(sandbox: Sandbox): Record<string, string> {
  const value = sandbox.metadata?.annotations?.[AI_VERSIONS_ANNOTATION];
  if (value === undefined) {
    return {};
  }
  const versions: Record<string, string> = {};
  for (const entry of value.split(',')) {
    const separator = entry.lastIndexOf('=');
    if (separator > 0 && separator < entry.length - 1) {
      versions[entry.slice(0, separator)] = entry.slice(separator + 1);
    }
  }
  return versions;
}

/**
 * The manifest the sandbox was created from, as the user saw it.
 *
 * Mirrors the devfile a DevWorkspace carries in `che.eclipse.org/devfile`: the
 * live object has been through a controller and an injector by the time it is
 * read back, so what was asked for is kept beside it.
 */
export function getSandboxOriginalManifest(sandbox: Sandbox): string | undefined {
  return sandbox.metadata?.annotations?.[ORIGINAL_MANIFEST_ANNOTATION];
}

/**
 * Flattens the resource limits of all containers into one readable string,
 * e.g. `cpu: 2, memory: 4Gi`.
 */
export function formatResourceLimits(sandbox: Sandbox): string {
  const containers = sandbox.spec?.podTemplate?.spec?.containers ?? [];
  const parts: string[] = [];

  for (const container of containers) {
    const limits = container.resources?.limits;
    if (!limits) {
      continue;
    }
    if (limits.cpu) {
      parts.push(`cpu: ${limits.cpu}`);
    }
    if (limits.memory) {
      parts.push(`memory: ${limits.memory}`);
    }
    if (limits['ephemeral-storage']) {
      parts.push(`storage: ${limits['ephemeral-storage']}`);
    }
  }

  return parts.length > 0 ? parts.join(', ') : '-';
}
