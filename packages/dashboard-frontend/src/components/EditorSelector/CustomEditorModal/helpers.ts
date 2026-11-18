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

/**
 * The editor name ends up as `metadata.name` of a DevWorkspaceTemplate, so it
 * has to be a RFC 1123 subdomain.
 */
export const MAX_EDITOR_NAME_LENGTH = 253;

const EDITOR_NAME_REGEXP = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/;

export function isValidEditorName(editorName: string): boolean {
  return (
    editorName.length > 0 &&
    editorName.length <= MAX_EDITOR_NAME_LENGTH &&
    EDITOR_NAME_REGEXP.test(editorName)
  );
}

function parseDefinition(editorDefinition: string): object | undefined {
  if (editorDefinition.trim().length === 0) {
    return undefined;
  }
  try {
    const parsed = load(editorDefinition);
    return typeof parsed === 'object' && parsed !== null ? (parsed as object) : undefined;
  } catch (e) {
    return undefined;
  }
}

/**
 * An editor definition is either an editor devfile or a reference to one with
 * optional overrides, the same two shapes `.che/che-editor.yaml` accepts.
 */
export function isValidEditorDefinition(editorDefinition: string): boolean {
  return parseDefinition(editorDefinition) !== undefined;
}

/**
 * Returns `metadata.name` of the editor devfile, when the definition carries
 * one. A reference to a devfile has no name until it is resolved.
 */
export function getEditorDefinitionName(editorDefinition: string): string | undefined {
  const parsed = parseDefinition(editorDefinition);
  if (parsed === undefined) {
    return undefined;
  }

  const metadata = (parsed as { metadata?: unknown }).metadata;
  if (typeof metadata !== 'object' || metadata === null) {
    return undefined;
  }

  const name = (metadata as { name?: unknown }).name;
  return typeof name === 'string' && name.length > 0 ? name : undefined;
}
