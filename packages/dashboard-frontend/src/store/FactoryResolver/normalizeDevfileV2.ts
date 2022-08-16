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

import { safeDump } from 'js-yaml';
import { cloneDeep } from 'lodash';
import { V220DevfileComponents } from '@devfile/api';
import { FactoryResolver, DevfileV2ProjectSource } from '../../services/helpers/types';
import devfileApi from '../../services/devfileApi';
import { getProjectName } from '../../services/helpers/getProjectName';
import {
  DEVWORKSPACE_DEVFILE_SOURCE,
  DEVWORKSPACE_METADATA_ANNOTATION,
} from '../../services/workspace-client/devworkspace/devWorkspaceClient';
import { generateWorkspaceName } from '../../services/helpers/generateName';

/**
 * Returns a devfile from the FactoryResolver object.
 * @param devfileLike a Devfile.
 * @param data a FactoryResolver object.
 * @param location a source location.
 * @param defaultComponents Default components. These default components
 * are meant to be used when a Devfile does not contain any components.
 */
export default function normalizeDevfileV2(
  devfileLike: devfileApi.DevfileLike,
  data: FactoryResolver,
  location: string,
  defaultComponents: V220DevfileComponents[],
  namespace: string,
): devfileApi.Devfile {
  const scmInfo = data['scm_info'];

  const projectName = getProjectName(scmInfo?.clone_url || location);
  const prefix = devfileLike.metadata?.generateName
    ? devfileLike.metadata.generateName
    : projectName;
  const name = devfileLike.metadata?.name || generateWorkspaceName(prefix);

  // set mandatory fields
  const devfile = cloneDeep(devfileLike) as devfileApi.Devfile;
  devfile.metadata.name = name;
  if (devfile.metadata.generateName) {
    delete devfile.metadata.generateName;
  }
  devfile.metadata.namespace = namespace;

  // propagate default components
  if (!devfile.components || devfile.components.length === 0) {
    devfile.components = defaultComponents;
  }

  // temporary solution for fix che-server serialization bug with empty volume
  devfile.components.forEach(component => {
    if (Object.keys(component).length === 1 && component.name) {
      component.volume = {};
    }
  });

  // add a default project
  const projects: DevfileV2ProjectSource[] = [];
  if (!devfile.projects?.length && scmInfo) {
    const origin = scmInfo.clone_url;
    const projectName = getProjectName(origin);
    const revision = scmInfo.branch;
    const project: DevfileV2ProjectSource = { name: projectName, git: { remotes: { origin } } };
    if (revision) {
      project.git.checkoutFrom = { revision };
    }
    projects.push(project);
    devfile.projects = projects;
  }

  // provide metadata about the origin of the devfile with DevWorkspace
  let devfileSource = '';
  if (data.source && scmInfo) {
    if (scmInfo.branch) {
      devfileSource = safeDump({
        scm: {
          repo: scmInfo['clone_url'],
          revision: scmInfo.branch,
          fileName: data.source,
        },
      });
    } else {
      devfileSource = safeDump({
        scm: {
          repo: scmInfo['clone_url'],
          fileName: data.source,
        },
      });
    }
  } else if (location) {
    devfileSource = safeDump({ url: { location } });
  }
  if (!devfile.metadata.attributes) {
    devfile.metadata.attributes = {};
  }
  if (!devfile.metadata.attributes[DEVWORKSPACE_METADATA_ANNOTATION]) {
    devfile.metadata.attributes[DEVWORKSPACE_METADATA_ANNOTATION] = {};
  }
  devfile.metadata.attributes[DEVWORKSPACE_METADATA_ANNOTATION][DEVWORKSPACE_DEVFILE_SOURCE] =
    devfileSource;

  return devfile;
}
