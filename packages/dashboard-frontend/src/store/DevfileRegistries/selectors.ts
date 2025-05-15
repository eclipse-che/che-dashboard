/*
 * Copyright (c) 2018-2024 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { createSelector } from '@reduxjs/toolkit';
import { load } from 'js-yaml';
import cloneDeep from 'lodash/cloneDeep';

import { DevfileAdapter } from '@/services/devfile/adapter';
import devfileApi from '@/services/devfileApi';
import { DEVWORKSPACE_STORAGE_TYPE_ATTR } from '@/services/devfileApi/devWorkspace/spec/template';
import stringify from '@/services/helpers/editor';
import match from '@/services/helpers/filter';
import { che } from '@/services/models';
import {
  DEVWORKSPACE_DEVFILE,
  DEVWORKSPACE_METADATA_ANNOTATION,
} from '@/services/workspace-client/devworkspace/devWorkspaceClient';
import { RootState } from '@/store';
import { getPvcStrategy } from '@/store/ServerConfig/helpers';
import { selectDefaultComponents } from '@/store/ServerConfig/selectors';

export const EMPTY_WORKSPACE_TAG = 'Empty';

const selectState = (state: RootState) => state.devfileRegistries;
const selectServerConfigState = (state: RootState) => state.dwServerConfig;

export const selectRegistriesMetadata = createSelector(selectState, devfileRegistriesState => {
  const registriesMetadata = Object.keys(devfileRegistriesState.registries).map(registry => {
    const metadata = devfileRegistriesState.registries[registry].metadata || [];
    return metadata.map(meta => Object.assign({ registry }, meta));
  });
  const metadata = mergeRegistriesMetadata(registriesMetadata);
  return filterDevfileV2Metadata(metadata);
});

export const selectIsRegistryDevfile = createSelector(selectState, state => {
  const registriesUrls = Object.keys(state.registries);

  return (url: string) =>
    registriesUrls.some(registryUrl => {
      const matchRegistryUrl = url.startsWith(registryUrl);
      if (matchRegistryUrl === true) {
        return true;
      }

      // if the url is not a subpath of the registry url,
      // check if it equals to a sample source url
      const registryMetadata = state.registries[registryUrl].metadata || [];

      return registryMetadata.some(meta => meta.links?.v2 === url);
    });
});

export const selectRegistriesErrors = createSelector(selectState, state => {
  const errors: Array<{ url: string; errorMessage: string }> = [];
  for (const [url, value] of Object.entries(state.registries)) {
    if (value.error) {
      errors.push({
        url,
        errorMessage: value.error,
      });
    }
  }
  return errors;
});

export const selectFilterValue = createSelector(selectState, state => state.filter);
export const selectLanguagesFilterValue = createSelector(
  selectState,
  state => state.languagesFilter,
);
export const selectTagsFilterValue = createSelector(selectState, state => state.tagsFilter);

export const selectMetadataFiltered = createSelector(
  selectLanguagesFilterValue,
  selectTagsFilterValue,
  selectFilterValue,
  selectRegistriesMetadata,
  (selectLanguagesFilterValue, selectTagsFilterValue, filterValue, metadata) => {
    let _metadata: DevfileRegistryMetadata[] = [...metadata];
    if (selectLanguagesFilterValue && selectLanguagesFilterValue.length > 0) {
      _metadata = _metadata.filter(
        meta => meta.language && selectLanguagesFilterValue.includes(meta.language),
      );
    }
    if (selectTagsFilterValue && selectTagsFilterValue.length > 0) {
      _metadata = _metadata.filter(meta =>
        meta.tags.some(tag => selectTagsFilterValue.includes(tag)),
      );
    }
    if (filterValue) {
      _metadata = _metadata.filter(meta => matches(meta, filterValue));
    }

    return _metadata;
  },
);

export const selectEmptyWorkspaceUrl = createSelector(selectRegistriesMetadata, metadata => {
  const v2Metadata = filterDevfileV2Metadata(metadata);
  const emptyWorkspaceMetadata = v2Metadata.find(meta => meta.tags.includes(EMPTY_WORKSPACE_TAG));
  return emptyWorkspaceMetadata?.links?.v2;
});

export const selectPvcStrategy = createSelector(selectServerConfigState, state =>
  getPvcStrategy(state),
);

export const selectDefaultDevfile = createSelector(
  selectState,
  selectPvcStrategy,
  selectDefaultComponents,
  selectEmptyWorkspaceUrl,
  (state, pvcStrategy, defaultComponents, devfileLocation) => {
    if (!devfileLocation) {
      return undefined;
    }
    const devfileContent = state.devfiles[devfileLocation]?.content;
    if (devfileContent) {
      try {
        const _devfile = load(devfileContent) as devfileApi.Devfile;
        const devfile = cloneDeep(_devfile);
        const devfileAttr = DevfileAdapter.getAttributes(devfile);
        if (!devfileAttr[DEVWORKSPACE_METADATA_ANNOTATION]) {
          devfileAttr[DEVWORKSPACE_METADATA_ANNOTATION] = {};
        }
        devfileAttr[DEVWORKSPACE_METADATA_ANNOTATION][DEVWORKSPACE_DEVFILE] = stringify(_devfile);
        // set default storage type if not set
        if (!devfileAttr[DEVWORKSPACE_STORAGE_TYPE_ATTR] && pvcStrategy) {
          devfileAttr[DEVWORKSPACE_STORAGE_TYPE_ATTR] = pvcStrategy;
        }
        // propagate default components
        if (!devfile.components || devfile.components.length === 0) {
          devfile.components = defaultComponents;
        }
        return devfile;
      } catch (e) {
        console.error(e);
      }
    }
    return undefined;
  },
);

function matches(meta: che.DevfileMetaData, filterValue: string): boolean {
  return (
    match(meta.displayName, filterValue) ||
    match(meta.description || '', filterValue) ||
    match(meta.tags.join(' '), filterValue) ||
    match(meta?.links?.v2 || '', filterValue)
  );
}

function mergeRegistriesMetadata(
  registriesMetadata: Array<Array<che.DevfileMetaData>>,
): Array<che.DevfileMetaData> {
  const _registriesMetadata = cloneDeep(registriesMetadata);
  return _registriesMetadata.reduce((mergedMetadata, registryMetadata) => {
    return mergedMetadata.concat(registryMetadata);
  }, []);
}

export type DevfileRegistryMetadata = che.DevfileMetaData & {
  links: {
    v2: string;
  };
};
function filterDevfileV2Metadata(
  metadata: Array<che.DevfileMetaData>,
): Array<DevfileRegistryMetadata> {
  return metadata.filter(metadata => metadata.links?.v2) as DevfileRegistryMetadata[];
}

export const selectDevWorkspaceResources = createSelector(
  selectState,
  state => state.devWorkspaceResources,
);
