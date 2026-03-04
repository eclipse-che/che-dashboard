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

/**
 * Backup-related constants shared between frontend and backend
 */

export const BACKUP_CACHE_TTL_SECONDS = 300;

export const BACKUP_LIST_DEFAULT_PAGE_SIZE = 50;
export const BACKUP_LIST_MAX_PAGE_SIZE = 100;
export const BACKUP_LIST_MIN_PAGE_SIZE = 1;

/** 1-indexed */
export const BACKUP_LIST_DEFAULT_PAGE = 1;

/**
 * Matches backup image URLs of the form registry[:port]/path/to/image:tag.
 * At least two path segments are required (namespace + workspace name).
 * Examples:
 *   image-registry.openshift-image-registry.svc:5000/user-che/my-workspace:latest
 *   quay.io/org/project/namespace/workspace:latest
 */
export const BACKUP_IMAGE_URL_PATTERN =
  /^([a-z0-9.-]+(?::[0-9]+)?)(\/[a-z0-9][a-z0-9._-]*){2,}:([a-z0-9._-]+)$/i;

/** Only :latest is supported in MVP — no versioned backup tags. */
export const BACKUP_IMAGE_DEFAULT_TAG = 'latest';

/**
 * DevWorkspace annotation keys for backup/restore
 */
export const DEVWORKSPACE_BACKUP_ANNOTATIONS = {
  /** Whether the last backup succeeded ("true" or "false"), set by DWO BackupCronJob controller */
  LAST_BACKUP_SUCCESSFUL: 'controller.devfile.io/last-backup-successful',
  /** ISO timestamp of when the last backup finished, set by DWO BackupCronJob controller */
  LAST_BACKUP_FINISHED_AT: 'controller.devfile.io/last-backup-finished-at',
  /** Error message from last backup failure, set by DWO BackupCronJob controller */
  LAST_BACKUP_ERROR: 'controller.devfile.io/last-backup-error',
  /** Indicates workspace should be restored from backup */
  RESTORE_WORKSPACE: 'controller.devfile.io/restore-workspace',
  /** Specifies the backup image URL to restore from */
  RESTORE_SOURCE_IMAGE: 'controller.devfile.io/restore-source-image',
} as const;

/**
 * DevWorkspace label keys for backup jobs.
 * These must match the labels set by DWO BackupCronJob controller
 * (see pkg/constants/metadata.go in devworkspace-operator).
 */
export const DEVWORKSPACE_BACKUP_LABELS = {
  /** Label on backup Job indicating the workspace name (DWO: DevWorkspaceNameLabel) */
  WORKSPACE_NAME: 'controller.devfile.io/devworkspace_name',
  /** Label on backup Job/ImageStream indicating the workspace ID (DWO: DevWorkspaceIDLabel) */
  WORKSPACE_ID: 'controller.devfile.io/devworkspace_id',
  /** Label on backup Job indicating it is a DWO-managed backup (DWO: DevWorkspaceBackupJobLabel) */
  DEVWORKSPACE_BACKUP: 'controller.devfile.io/backup-job',
} as const;

/** Polling interval for backup job status — fallback when WebSocket is unavailable. */
export const BACKUP_JOB_POLLING_INTERVAL_MS = 5000;

/**
 * HTTP status codes for backup-specific errors
 */
export const BACKUP_ERROR_CODES = {
  BACKUP_NOT_CONFIGURED: 'BACKUP_NOT_CONFIGURED',
  BACKUP_IMAGE_NOT_FOUND: 'BACKUP_IMAGE_NOT_FOUND',
  REGISTRY_AUTH_FAILED: 'REGISTRY_AUTH_FAILED',
  INVALID_IMAGE_URL: 'INVALID_IMAGE_URL',
  INVALID_NAMESPACE: 'INVALID_NAMESPACE',
  INVALID_PAGE_NUMBER: 'INVALID_PAGE_NUMBER',
  INVALID_PAGE_SIZE: 'INVALID_PAGE_SIZE',
  DEVWORKSPACE_NOT_FOUND: 'DEVWORKSPACE_NOT_FOUND',
  JOB_API_ERROR: 'JOB_API_ERROR',
  JOB_NOT_FOUND: 'JOB_NOT_FOUND',
  REGISTRY_API_ERROR: 'REGISTRY_API_ERROR',
  TIMEOUT: 'TIMEOUT',
} as const;
