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

import axios from 'axios';
import common from '@eclipse-che/common';
import { prefix } from './const';

/**
 * Returns an array of default plug-ins for the specified editor
 * 
 * @param editorId The editor id to get default plug-ins for
 * @returns Promise resolving with the array of default plug-ins for the specified editor
 */
export async function getDefaultPlugins(editorId: string): Promise<string[]> {
  const url = `${prefix}/server-config/default-plugins`;
  try {
    const response = await axios.get(url);
    const editorPlugins = response.data.find((element: { editor: string; plugins: string[] }) =>
      element.editor.toLowerCase() === editorId,
    );
    return editorPlugins ? editorPlugins.plugins : [];
  } catch (e) {
    throw `Failed to fetch default plugins. ${common.helpers.errors.getMessage(e)}`;
  }
}
