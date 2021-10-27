/*
 * Copyright (c) 2018-2021 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

export const clusterConsoleUrl = process.env['OPENSHIFT_CONSOLE_URL'] || '';
export const clusterConsoleTitle = process.env['OPENSHIFT_CONSOLE_TITLE']
  || 'OpenShift console';
export const clusterConsoleIcon = process.env['OPENSHIFT_CONSOLE_ICON']
  || (clusterConsoleUrl ? clusterConsoleUrl + '/static/assets/redhat.svg' : '');
export const clusterConsoleGroup = process.env['OPENSHIFT_CONSOLE_GROUP'];
