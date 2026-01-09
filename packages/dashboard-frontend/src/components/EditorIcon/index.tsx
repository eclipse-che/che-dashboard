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

import { Tooltip } from '@patternfly/react-core';
import { RegistryIcon } from '@patternfly/react-icons';
import { load } from 'js-yaml';
import React from 'react';

import styles from '@/components/EditorIcon/index.module.css';
import devfileApi from '@/services/devfileApi';
import { DEVWORKSPACE_CHE_EDITOR } from '@/services/devfileApi/devWorkspace/metadata';
import { isDevfileV2 } from '@/services/devfileApi/typeguards';
import { Workspace } from '@/services/workspace-adapter';

export type Props = {
  editors: devfileApi.Devfile[];
  workspace: Workspace;
};

/**
 * Checks if the string is a valid HTTP/HTTPS URL.
 */
export function isEditorUrl(cheEditor: string): boolean {
  return /^http[s]?:\/\/.*/.test(cheEditor);
}

/**
 * Checks if the annotation contains inline devfile content.
 */
export function isInlineEditorContent(cheEditor: string): boolean {
  try {
    const parsed = load(cheEditor);
    return isDevfileV2(parsed);
  } catch {
    return false;
  }
}

/**
 * Checks if the string is a valid editor ID format (publisher/name/version).
 */
export function isEditorId(cheEditor: string): boolean {
  // Editor ID format: publisher/name/version (e.g. che-incubator/che-code/insiders)
  const parts = cheEditor.split('/');
  return parts.length === 3 && parts.every(part => part.length > 0 && !part.includes(' '));
}

/**
 * Parses inline editor content to extract editor information.
 */
export function parseInlineEditor(cheEditor: string): devfileApi.Devfile | undefined {
  try {
    const parsed = load(cheEditor);
    if (isDevfileV2(parsed)) {
      return parsed;
    }
  } catch {
    // Failed to parse YAML, return undefined
  }
  return undefined;
}

/**
 * Gets the editor ID from workspace annotation.
 * Returns undefined if the annotation is empty, contains inline content, is a URL, or is not a valid editor ID format.
 */
export function getEditorId(workspace: Workspace): string | undefined {
  const cheEditor = workspace.ref.metadata.annotations?.[DEVWORKSPACE_CHE_EDITOR];
  if (!cheEditor) {
    return undefined;
  }
  // Skip URLs (custom editor from URL)
  if (isEditorUrl(cheEditor)) {
    return undefined;
  }
  // Skip inline devfile content
  if (cheEditor.includes('schemaVersion:')) {
    return undefined;
  }
  // Skip content that failed to parse
  if (!isEditorId(cheEditor)) {
    return undefined;
  }
  return cheEditor;
}

/**
 * Extracts the short editor name from editor ID.
 * Example: "che-incubator/che-code/insiders" -> "che-code"
 */
export function getShortEditorName(editorId: string): string {
  const parts = editorId.split('/');
  if (parts.length >= 2) {
    return parts[1]; // Return the middle part (editor name)
  }
  return editorId;
}

/**
 * Finds the editor from the registry by ID.
 */
export function findEditor(
  editors: devfileApi.Devfile[],
  editorId?: string,
): devfileApi.Devfile | undefined {
  if (!editorId) {
    return undefined;
  }
  return editors.find(editor => {
    const id =
      editor.metadata.attributes?.publisher +
      '/' +
      editor.metadata.name +
      '/' +
      editor.metadata.attributes?.version;
    return id === editorId;
  });
}

/**
 * Gets the editor name for sorting purposes.
 * Returns the short name from either inline content, URL, or editor ID.
 */
export function getEditorName({ editors, workspace }: Props): string | undefined {
  const cheEditor = workspace.ref.metadata.annotations?.[DEVWORKSPACE_CHE_EDITOR];
  if (!cheEditor) {
    return undefined;
  }

  // Handle URL editor - return "Custom" for sorting
  if (isEditorUrl(cheEditor)) {
    return 'Custom';
  }

  // Handle inline editor content - return "custom" for sorting
  if (isInlineEditorContent(cheEditor)) {
    const inlineEditor = parseInlineEditor(cheEditor);
    return inlineEditor?.metadata?.displayName || 'Custom';
  }

  // Handle editor ID reference
  const editorId = getEditorId(workspace);
  if (!editorId) {
    return undefined;
  }

  const editor = findEditor(editors, editorId);
  const shortEditorName = getShortEditorName(editorId);

  return editor?.metadata?.displayName || shortEditorName;
}

function getIcon(editor?: devfileApi.Devfile): React.ReactElement {
  const iconData = editor?.metadata?.attributes?.iconData;
  const iconMediatype = editor?.metadata?.attributes?.iconMediatype;

  if (iconData && iconMediatype) {
    // SVG icons need URL encoding, other formats use the data directly
    const iconSrc =
      iconMediatype === 'image/svg+xml'
        ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconData)}`
        : iconData;
    return <img src={iconSrc} alt={'...'} className={styles.icon} />;
  }

  return <RegistryIcon className={styles.icon} />;
}

function getTooltipText(editor?: devfileApi.Devfile): string {
  return (
    editor?.metadata?.description ||
    editor?.metadata?.displayName ||
    editor?.metadata?.name ||
    'Unknown Editor type'
  );
}

/**
 * Displays the editor icon with name, version tag, and a tooltip showing description or name.
 */
export function EditorIcon(props: Props): React.ReactElement {
  const { workspace, editors } = props;
  // If getEditorName returns undefined, don't render anything
  const editorName = getEditorName(props) || '-';
  if (editorName === undefined) {
    return <span>-</span>;
  }

  // Safe to assert - getEditorName already checked for cheEditor presence
  const cheEditor = workspace.ref.metadata.annotations?.[DEVWORKSPACE_CHE_EDITOR] as string;

  // Handle URL editor (custom editor from URL) - clickable link without tooltip
  if (isEditorUrl(cheEditor)) {
    return (
      <a href={cheEditor} target="_blank" rel="noopener noreferrer">
        <RegistryIcon className={styles.icon} />
        <span className={styles.name}>{editorName}</span>
      </a>
    );
  }

  // Handle inline editor content
  if (isInlineEditorContent(cheEditor)) {
    const inlineEditor = parseInlineEditor(cheEditor);
    const icon = getIcon(inlineEditor);
    const tooltipText = getTooltipText(inlineEditor);

    return (
      <Tooltip content={tooltipText}>
        <span className={styles.container}>
          {icon}
          <span className={styles.name}>{editorName}</span>
        </span>
      </Tooltip>
    );
  }

  // Handle editor ID reference
  const editorId = getEditorId(workspace);
  const editor = findEditor(editors, editorId);

  if (!editor) {
    // Show default icon with editor ID as tooltip if editor not found in registry
    return (
      <span className={styles.container}>
        <RegistryIcon className={styles.icon} />
        <span className={styles.name}>{editorName}</span>
      </span>
    );
  }

  const tooltipText = getTooltipText(editor);
  const icon = getIcon(editor);

  return (
    <Tooltip content={tooltipText}>
      <span className={styles.container}>
        {icon}
        <span className={styles.name}>{editorName}</span>
      </span>
    </Tooltip>
  );
}
