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
 * Checks if the annotation contains inline devfile content.
 */
export function isInlineEditorContent(cheEditor: string): boolean {
  return cheEditor.startsWith('schemaVersion') || cheEditor.startsWith('apiVersion');
}

/**
 * Checks if the annotation contains a URL to an editor devfile.
 */
export function isEditorUrl(cheEditor: string): boolean {
  return cheEditor.startsWith('http://') || cheEditor.startsWith('https://');
}

/**
 * Parses inline editor content to extract editor information.
 */
export function parseInlineEditor(
  cheEditor: string,
): { name: string; displayName: string; description?: string } | undefined {
  try {
    const parsed = load(cheEditor);
    if (isDevfileV2(parsed)) {
      return {
        name: parsed.metadata.name,
        displayName: parsed.metadata.displayName || parsed.metadata.name,
        description: parsed.metadata.description,
      };
    }
  } catch {
    // Failed to parse YAML, return undefined
  }
  return undefined;
}

/**
 * Gets the editor ID from workspace annotation.
 * Returns undefined if the annotation is empty, contains inline content, or is a URL.
 */
export function getEditorId(workspace: Workspace): string | undefined {
  const cheEditor = workspace.ref.metadata.annotations?.[DEVWORKSPACE_CHE_EDITOR];
  if (!cheEditor) {
    return undefined;
  }
  // Skip inline devfile content
  if (isInlineEditorContent(cheEditor)) {
    return undefined;
  }
  // Skip URLs (custom editor from URL)
  if (isEditorUrl(cheEditor)) {
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
  editorId: string,
): devfileApi.Devfile | undefined {
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
export function getEditorName(workspace: Workspace): string | undefined {
  const cheEditor = workspace.ref.metadata.annotations?.[DEVWORKSPACE_CHE_EDITOR];
  if (!cheEditor) {
    return undefined;
  }

  // Handle inline editor content - return "custom" for sorting
  if (isInlineEditorContent(cheEditor)) {
    return 'custom';
  }

  // Handle URL editor - return "custom" for sorting
  if (isEditorUrl(cheEditor)) {
    return 'custom';
  }

  // Handle editor ID reference
  const editorId = getEditorId(workspace);
  if (!editorId) {
    return undefined;
  }

  // Return short name from editor ID
  return getShortEditorName(editorId);
}

/**
 * Displays the editor icon with name, version tag, and a tooltip showing description or name.
 */
export function EditorIcon({ editors, workspace }: Props): React.ReactElement {
  const cheEditor = workspace.ref.metadata.annotations?.[DEVWORKSPACE_CHE_EDITOR];

  // No editor annotation
  if (!cheEditor) {
    return <span className={styles.placeholder}>-</span>;
  }

  // Handle inline editor content
  if (isInlineEditorContent(cheEditor)) {
    const inlineEditor = parseInlineEditor(cheEditor);
    if (inlineEditor) {
      // Use description if available, otherwise use displayName
      const tooltipText = inlineEditor.description || inlineEditor.displayName;
      return (
        <Tooltip content={tooltipText}>
          <span className={styles.container}>
            <RegistryIcon className={styles.defaultIcon} />
            &nbsp;
            <span className={styles.name}>custom</span>
          </span>
        </Tooltip>
      );
    }
    // Failed to parse inline content
    return <span className={styles.placeholder}>-</span>;
  }

  // Handle URL editor (custom editor from URL)
  if (isEditorUrl(cheEditor)) {
    return (
      <Tooltip content={cheEditor}>
        <span className={styles.container}>
          <RegistryIcon className={styles.defaultIcon} />
          &nbsp;
          <span className={styles.name}>custom</span>
        </span>
      </Tooltip>
    );
  }

  // Handle editor ID reference
  const editorId = getEditorId(workspace);
  if (!editorId) {
    return <span className={styles.placeholder}>-</span>;
  }

  const shortName = getShortEditorName(editorId);
  const editor = findEditor(editors, editorId);

  if (!editor) {
    // Show default icon with editor ID as tooltip if editor not found in registry
    return (
      <Tooltip content={editorId}>
        <span className={styles.container}>
          <RegistryIcon className={styles.defaultIcon} />
          &nbsp;
          <span className={styles.name}>{shortName}</span>
        </span>
      </Tooltip>
    );
  }

  // Use description if available, otherwise use name
  const tooltipText = editor.metadata.description || editor.metadata.name;
  const displayName = editor.metadata.displayName || editor.metadata.name;
  const iconData = editor.metadata.attributes?.iconData;
  const iconMediatype = editor.metadata.attributes?.iconMediatype;

  // If we have icon data, render the image with name
  if (iconData && iconMediatype) {
    // SVG icons need URL encoding, other formats use the data directly
    const iconSrc =
      iconMediatype === 'image/svg+xml'
        ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconData)}`
        : iconData;
    return (
      <Tooltip content={tooltipText}>
        <span className={styles.container}>
          <img src={iconSrc} alt={displayName} className={styles.icon} />
          &nbsp;
          <span className={styles.name}>{shortName}</span>
        </span>
      </Tooltip>
    );
  }

  // Fallback: show default icon with name
  return (
    <Tooltip content={tooltipText}>
      <span className={styles.container}>
        <RegistryIcon className={styles.defaultIcon} />
        &nbsp;
        <span className={styles.name}>{shortName}</span>
      </span>
    </Tooltip>
  );
}
