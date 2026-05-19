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

// Minimum hold time and per-character rate for computing how long each message
// stays in the live region before clearing.
export const ANNOUNCE_MIN_HOLD_MS = 1500;
export const ANNOUNCE_MS_PER_CHAR = 60;
// Gap between clearing one message and showing the next.
export const ANNOUNCE_GAP_MS = 150;

const queue: string[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let node: HTMLElement | null = null;

function getLiveNode(): HTMLElement {
  if (!node || !document.body.contains(node)) {
    node = document.createElement('span');
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    node.setAttribute('aria-atomic', 'true');
    node.className = 'pf-v6-screen-reader';
    document.body.appendChild(node);
  }
  return node;
}

function drainQueue(): void {
  if (queue.length === 0) {
    timer = null;
    return;
  }
  const text = queue.shift()!;
  const holdMs = Math.max(ANNOUNCE_MIN_HOLD_MS, text.length * ANNOUNCE_MS_PER_CHAR);
  getLiveNode().textContent = text;
  timer = setTimeout(() => {
    getLiveNode().textContent = '';
    timer = setTimeout(drainQueue, ANNOUNCE_GAP_MS);
  }, holdMs);
}

export function enqueueAnnouncement(text: string): void {
  queue.push(text);
  if (timer === null) {
    drainQueue();
  }
}

export function _resetQueueForTests(): void {
  queue.length = 0;
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  if (node && document.body.contains(node)) {
    document.body.removeChild(node);
  }
  node = null;
}
