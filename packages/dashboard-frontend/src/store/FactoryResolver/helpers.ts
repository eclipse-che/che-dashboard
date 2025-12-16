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

import { V230DevfileComponents, V230DevfileProjects } from '@devfile/api';
import common, { api } from '@eclipse-che/common';
import axios from 'axios';
import { dump } from 'js-yaml';
import cloneDeep from 'lodash/cloneDeep';

import { DevfileAdapter } from '@/services/devfile/adapter';
import devfileApi, { isDevfileV2 } from '@/services/devfileApi';
import stringify from '@/services/helpers/editor';
import { FactoryParams } from '@/services/helpers/factoryFlow/buildFactoryParams';
import { generateWorkspaceName } from '@/services/helpers/generateName';
import { getProjectName } from '@/services/helpers/getProjectName';
import { DevfileV2ProjectSource, FactoryResolver } from '@/services/helpers/types';
import { che } from '@/services/models';
import {
  DEVWORKSPACE_DEVFILE,
  DEVWORKSPACE_DEVFILE_SOURCE,
  DEVWORKSPACE_METADATA_ANNOTATION,
} from '@/services/workspace-client/devworkspace/devWorkspaceClient';
import { DEFAULT_REGISTRY } from '@/store/DevfileRegistries';

/**
 * Grabs an editor devfile from the provided links.
 */
export async function grabLink(
  links: che.api.core.rest.Link[] = [],
  filename: string,
): Promise<{ location: string; content: string } | undefined> {
  // handle servers not yet providing links
  if (links.length === 0) {
    return undefined;
  }
  // grab the one matching
  const foundLink = links.find(link => link.href?.includes(`file=${filename}`));
  if (!foundLink || !foundLink.href) {
    return undefined;
  }

  const url = new URL(foundLink.href);
  url.searchParams.forEach((value, key) => url.searchParams.set(key, encodeURI(value)));

  try {
    // in dev mode, we need to replace the localhost by the current origin
    const location = url.href.replace(
      /^http:\/\/localhost:8081\/api\//,
      `${window.location.origin}/api/`,
    );
    // load it in raw format
    // see https://github.com/axios/axios/issues/907
    const response = await axios.get<string>(location, {
      responseType: 'text',
      transformResponse: [
        data => {
          return data;
        },
      ],
    });
    return { location, content: response.data };
  } catch (error) {
    // content may not be there
    if (
      (common.helpers.errors.includesAxiosResponse(error) && error.response?.status == 404) ||
      error?.['code'] === 'ERR_NETWORK'
    ) {
      return undefined;
    }
    throw error;
  }
}

/**
 * Checks if the location is a devfile registry location.
 */
export function isDevfileRegistryLocation(location: string, config: api.IServerConfig): boolean {
  const devfileRegistries = [`${window.location.origin}${DEFAULT_REGISTRY}`];

  const externalDevfileRegistries = config.devfileRegistry.externalDevfileRegistries.map(
    externalDevfileRegistry => externalDevfileRegistry.url,
  );
  if (externalDevfileRegistries.length) {
    devfileRegistries.push(...externalDevfileRegistries);
  }

  return devfileRegistries.some(registry => location.startsWith(registry));
}

/**
 * Returns `true` if the devfile was resolved successfully.
 */
/* c8 ignore next 3 */
export function isDevfileFoundInRepo(data: FactoryResolver): boolean {
  return data.source !== 'repo';
}

/**
 * Builds a Devfile V2 from a default Devfile V1 returned by che-server.
 */
export function buildDevfileV2(
  devfileV1: che.api.workspace.devfile.Devfile | undefined,
): devfileApi.DevfileLike {
  const devfile = {
    schemaVersion: '2.2.2',
  } as devfileApi.DevfileLike;

  const metadataV1 = devfileV1?.metadata;
  if (metadataV1 !== undefined) {
    devfile.metadata = metadataV1;
  }

  const projectV1 = devfileV1?.projects?.[0];
  if (projectV1 !== undefined) {
    const projectName = (projectV1.name || metadataV1?.name || metadataV1?.generateName || '')
      // the name can't have spaces
      // replace space by dash and then remove all special characters
      .replace(/\s+/g, '-')
      // names should not use _
      .replace(/_/g, '-')
      // names should not use .
      .replace(/\./g, '-')
      // trim '-' character from start or end
      .replace(/^-+|-+$/g, '')
      .toLowerCase();

    const devfileV2Project: V230DevfileProjects = {
      attributes: {},
      name: projectName,
    };
    if (projectV1.clonePath) {
      devfileV2Project.clonePath = projectV1.clonePath;
    }

    if (projectV1.source) {
      const source = projectV1.source;
      if (source.type === 'git' || source.type === 'github' || source.type === 'bitbucket') {
        const remotes = { origin: source.location! };
        devfileV2Project.git = {
          remotes,
        };
      } else if (source.type === 'zip') {
        devfileV2Project.zip = {
          location: source.location,
        };
      }
    }
    devfile.projects = [devfileV2Project];
  }
  return devfile;
}

/**
 * Returns a devfile from the FactoryResolver object.
 * @param data a FactoryResolver object.
 * @param location a source location.
 * @param defaultComponents Default components. These default components
 * are meant to be used when a Devfile does not contain any components.
 * @param factoryParams a Partial<FactoryParams> object.
 */

export function normalizeDevfile(
  data: FactoryResolver,
  location: string,
  defaultComponents: V230DevfileComponents[],
  factoryParams: Partial<FactoryParams>,
): devfileApi.Devfile {
  /* Validate object */
  if (!isDevfileV2(data.devfile)) {
    throw new Error('Received object is not a Devfile V2.');
  }

  const scmInfo = data['scm_info'];
  const devfile = cloneDeep(data.devfile);

  /* Devfile Metadata */

  const projectName = getProjectName(scmInfo?.clone_url || location);
  const namePrefix = devfile.metadata?.generateName ? devfile.metadata?.generateName : projectName;
  const name = devfile.metadata?.name || generateWorkspaceName(namePrefix);

  if (!devfile.metadata) {
    devfile.metadata = { name };
  } else {
    devfile.metadata.name = factoryParams.name
      ? factoryParams.name
      : devfile.metadata?.name || generateWorkspaceName(namePrefix);
    if (devfile.metadata.generateName) {
      delete devfile.metadata.generateName;
    }
  }

  /* Devfile Components */

  // propagate default components
  if (!devfile.parent && (!devfile.components || devfile.components.length === 0)) {
    devfile.components = cloneDeep(defaultComponents);
  }

  if (devfile.components && devfile.components.length > 0) {
    if (devfile.components[0].container) {
      // apply the custom image from factory params
      if (factoryParams.image && devfile.components[0].container.image) {
        devfile.components[0].container.image = factoryParams.image;
      }
      // apply the custom memoryLimit from factory params
      if (factoryParams.memoryLimit) {
        devfile.components[0].container.memoryLimit = factoryParams.memoryLimit;
      }
      // apply the custom cpuLimit from factory params
      if (factoryParams.cpuLimit) {
        devfile.components[0].container.cpuLimit = factoryParams.cpuLimit;
      }
    }
    // temporary solution for fix che-server serialization bug with empty volume
    devfile.components.forEach(component => {
      if (Object.keys(component).length === 1 && component.name) {
        component.volume = {};
      }
    });
  }

  /* Devfile Projects */

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
      devfileSource = dump({
        scm: {
          repo: scmInfo['clone_url'],
          revision: scmInfo.branch,
          fileName: data.source,
        },
      });
    } else {
      devfileSource = dump({
        scm: {
          repo: scmInfo['clone_url'],
          fileName: data.source,
        },
      });
    }
  } else if (location) {
    devfileSource = dump({ url: { location } });
  }

  /* Devfile Attributes */

  const attributes = DevfileAdapter.getAttributes(devfile);

  if (!attributes[DEVWORKSPACE_METADATA_ANNOTATION]) {
    attributes[DEVWORKSPACE_METADATA_ANNOTATION] = {};
  }
  attributes[DEVWORKSPACE_METADATA_ANNOTATION][DEVWORKSPACE_DEVFILE_SOURCE] = devfileSource;
  attributes[DEVWORKSPACE_METADATA_ANNOTATION][DEVWORKSPACE_DEVFILE] = stringify(data.devfile);
  return devfile;
}
