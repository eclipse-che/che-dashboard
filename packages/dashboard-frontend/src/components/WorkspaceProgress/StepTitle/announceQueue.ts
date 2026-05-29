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

// How long each message is held in the live region before clearing.
// 1200 ms gives screen readers enough time to finish reading long messages
// (e.g. "Step: Waiting for workspace to start / Networking is preparing")
// even at slower voice speeds.
export const ANNOUNCE_HOLD_MS = 1200;
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
  getLiveNode().textContent = text;
  timer = setTimeout(() => {
    getLiveNode().textContent = '';
    timer = setTimeout(drainQueue, ANNOUNCE_GAP_MS);
  }, ANNOUNCE_HOLD_MS);
}

export function enqueueAnnouncement(text: string): void {
  // Skip if the identical text is already waiting at the back of the queue —
  // multiple status-indicator instances for the same workspace would otherwise
  // announce the same message several times in quick succession.
  if (queue.length > 0 && queue[queue.length - 1] === text) {
    return;
  }
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
