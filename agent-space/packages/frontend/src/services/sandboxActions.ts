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

import { ACTION_LABELS, getAvailableActions, getSandboxPhase } from '@/services/sandbox';
import { Sandbox, SandboxAction } from '@/services/types';

/**
 * One entry of a sandbox action menu, as a plain descriptor.
 *
 * The table renders these through `ActionsColumn` and the sidebar through a
 * `Dropdown`; describing them once here is what keeps the two menus offering
 * the same actions for the same phase.
 */
export type SandboxActionItem =
  | { kind: 'separator'; key: string }
  | {
      kind: 'item';
      key: string;
      title: string;
      isDisabled: boolean;
      isDanger: boolean;
      onSelect: () => void;
    };

export interface SandboxActionOptions {
  sandbox: Sandbox;
  /** True while another action is already running against the namespace. */
  isDisabled: boolean;
  onRunAction: (name: string, action: SandboxAction) => void;
  onDelete: (name: string) => void;
}

/**
 * The actions offered for one sandbox: the lifecycle ones its current phase
 * allows, then Delete on its own.
 */
export function buildSandboxActionItems({
  sandbox,
  isDisabled,
  onRunAction,
  onDelete,
}: SandboxActionOptions): SandboxActionItem[] {
  const name = sandbox.metadata.name;

  const items: SandboxActionItem[] = getAvailableActions(getSandboxPhase(sandbox)).map(action => ({
    kind: 'item',
    key: action,
    title: ACTION_LABELS[action],
    isDisabled,
    isDanger: false,
    onSelect: () => onRunAction(name, action),
  }));

  items.push({ kind: 'separator', key: 'delete-separator' });
  items.push({
    kind: 'item',
    key: 'delete',
    title: 'Delete',
    isDisabled,
    isDanger: true,
    onSelect: () => onDelete(name),
  });

  return items;
}
