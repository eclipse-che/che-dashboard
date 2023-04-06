/*
 * Copyright (c) 2018-2023 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import devfileApi from '../devfileApi';

export function getAttributesFromDevfileV2(devfile: devfileApi.Devfile) {
  let attributes = {};
  if (devfile.schemaVersion?.startsWith('2.0')) {
    if (!devfile.metadata.attributes) {
      devfile.metadata.attributes = attributes;
    } else {
      attributes = devfile.metadata.attributes;
    }
  } else {
    if (!devfile.attributes) {
      devfile.attributes = attributes;
    } else {
      attributes = devfile.attributes;
    }
  }

  return attributes;
}
