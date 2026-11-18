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

/** The keys that tell an editor devfile or a reference to one from any other YAML. */
const DEFINITION_KEYS = ['schemaVersion', 'reference', 'id', 'inline'] as const;

export type ParsedEditorDefinition = {
  /** True when the document is an editor devfile or a reference to one. */
  isValid: boolean;
  /** `metadata.name` of an editor devfile, absent on a reference. */
  name: string | undefined;
};

const EMPTY_DEFINITION: ParsedEditorDefinition = { isValid: false, name: undefined };

function readName(parsed: object): string | undefined {
  const metadata = (parsed as { metadata?: unknown }).metadata;
  if (typeof metadata !== 'object' || metadata === null) {
    return undefined;
  }

  const name = (metadata as { name?: unknown }).name;
  return typeof name === 'string' && name.length > 0 ? name : undefined;
}

/**
 * Parses an editor definition once, so a caller does not pay for the YAML on
 * every keystroke and on every render. A definition is either an editor
 * devfile or a reference to one with optional overrides, the same two shapes
 * `.che/che-editor.yaml` accepts.
 */
export function parseEditorDefinition(editorDefinition: string): ParsedEditorDefinition {
  if (editorDefinition.trim().length === 0) {
    return EMPTY_DEFINITION;
  }

  let parsed: unknown;
  try {
    parsed = load(editorDefinition);
  } catch (e) {
    return EMPTY_DEFINITION;
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return EMPTY_DEFINITION;
  }

  const isValid = DEFINITION_KEYS.some(key => key in parsed);
  return { isValid, name: isValid ? readName(parsed) : undefined };
}
