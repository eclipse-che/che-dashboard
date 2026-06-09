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
// Maximum number of pending messages. When exceeded the oldest pending entry
// is dropped so log floods do not cause a minutes-long announcement backlog.
export const MAX_QUEUE_SIZE = 10;

const queue: string[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let node: HTMLElement | null = null;
// Text currently shown in the live region (reset when the region is cleared).
let currentText = '';

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
    currentText = '';
    return;
  }
  const text = queue.shift()!;
  currentText = text;
  getLiveNode().textContent = text;
  timer = setTimeout(() => {
    getLiveNode().textContent = '';
    currentText = '';
    timer = setTimeout(drainQueue, ANNOUNCE_GAP_MS);
  }, ANNOUNCE_HOLD_MS);
}

export function enqueueAnnouncement(text: string): void {
  // Skip if this text is already being displayed in the live region — this
  // catches dual-path duplicates (e.g. WorkspaceProgress + WorkspaceStatusIndicator)
  // that fire synchronously in the same React commit and drain the queue immediately.
  if (text === currentText) {
    return;
  }
  // Skip if the identical text is already at the back of the pending queue.
  if (queue.length > 0 && queue[queue.length - 1] === text) {
    return;
  }
  // Drop the oldest pending entry when the queue is full so verbose log output
  // does not build a minutes-long announcement backlog.
  if (queue.length >= MAX_QUEUE_SIZE) {
    queue.shift();
  }
  queue.push(text);
  if (timer === null) {
    drainQueue();
  }
}

export function _resetQueueForTests(): void {
  queue.length = 0;
  currentText = '';
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  if (node && document.body.contains(node)) {
    document.body.removeChild(node);
  }
  node = null;
}
