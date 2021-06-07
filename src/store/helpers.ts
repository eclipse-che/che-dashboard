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

import { FactoryResolver } from '../services/helpers/types';
import { isDevfileV2 } from '../services/workspaceAdapter';

const PROJECT_NAME_MAX_LENGTH = 63;

type ProjectV2Source = {
  name: string;
  git: {
    remotes: { origin: string };
    checkoutFrom?: { revision: string };
  }
};

/**
 * Creates a new state object.
 * @param state a store state, e.g workspaces, plugins.
 * @param partial a slice of a store state
 */
export function createState<T>(state: T, partial: Partial<T>): T {
  return Object.assign({}, state, partial);
}

/**
 * Returns a devfile from the FactoryResolver object.
 * @param data a FactoryResolver object.
 */
export function getDevfile(data: FactoryResolver): api.che.workspace.devfile.Devfile {
  let devfile = data.devfile;

  if (isDevfileV2(devfile)) {
    devfile = Object.assign(devfile, { components });
    // add a default project
    const projects: ProjectV2Source[] = [];
    const scmInfo = data['scm_info'];
    if (!devfile.projects?.length && scmInfo) {
      const origin = scmInfo['clone_url'];
      const name = getProjectName(origin);
      const revision = scmInfo.branch;
      const project: ProjectV2Source = { name, git: { remotes: { origin } } };
      if (revision) {
        project.git.checkoutFrom = { revision };
      }
      projects.push(project);
      devfile = Object.assign({ projects }, devfile);
    }
  }

  return devfile;
}

export function getProjectName(cloneUrl: string): string {
  let name = cloneUrl.split('/').reverse()[0].replace(/(.git)$/, '');
  name = name.replace(/([^-a-zA-Z0-9]+)/, '-');
  name = name.replace(/(^[-]+)/, '');
  name = name.replace(/([-]+$)/, '');
  if (name.length > PROJECT_NAME_MAX_LENGTH) {
    name = name.substr(0, PROJECT_NAME_MAX_LENGTH - 1);
  }

  return name;
}
