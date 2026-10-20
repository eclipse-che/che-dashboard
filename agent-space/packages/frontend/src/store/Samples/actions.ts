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

import { createAction } from '@reduxjs/toolkit';
import { load } from 'js-yaml';

import { getSandboxClient } from '@/services/client/instance';
import { fetchSampleManifest, fetchSamples, SandboxSample, toSandbox } from '@/services/samples';
import {
  applyCustomization,
  applySampleOverrides,
  NO_CUSTOMIZATION,
  SandboxCustomization,
  withOriginalManifest,
} from '@/services/sandboxFactory';
import { applyStorage, DEFAULT_STORAGE_TYPE, SandboxStorageType } from '@/services/sandboxStorage';
import { isAlreadyExistsError, Sandbox, SandboxError, toSandboxError } from '@/services/types';
import { AppThunk } from '@/store';
import { selectNamespace, selectSamplesIndexUrl } from '@/store/Bootstrap';
import { catalogActionCreators, selectAiTools, selectCatalogIsLoaded } from '@/store/Catalog';
import { selectSampleManifestId } from '@/store/Samples/selectors';

export const samplesRequestAction = createAction('samples/request');
export const samplesReceiveAction = createAction<SandboxSample[]>('samples/receive');
export const samplesErrorAction = createAction<SandboxError>('samples/receiveError');

export const sampleCreateRequestAction = createAction<string>('samples/create/request');
export const sampleCreateReceiveAction = createAction('samples/create/receive');
export const sampleCreateErrorAction = createAction<SandboxError>('samples/create/receiveError');
export const sampleCreateClearErrorAction = createAction('samples/create/clearError');

export const sampleManifestRequestAction = createAction<string>('samples/manifest/request');
export const sampleManifestReceiveAction = createAction<string>('samples/manifest/receive');
export const sampleManifestErrorAction = createAction<SandboxError>(
  'samples/manifest/receiveError',
);
export const sampleManifestCloseAction = createAction('samples/manifest/close');

export const actionCreators = {
  requestSamples:
    (): AppThunk =>
    async (dispatch, getState): Promise<void> => {
      try {
        dispatch(samplesRequestAction());

        const samples = await fetchSamples(selectSamplesIndexUrl(getState()));
        dispatch(samplesReceiveAction(samples));
      } catch (e) {
        dispatch(samplesErrorAction(toSandboxError(e)));
      }
    },

  /**
   * Creates a sandbox from an upstream sample manifest, applied as published
   * apart from the namespace and the agents picked on the page. Resolves to the
   * created sandbox, or to `undefined` when the failure has been recorded in
   * the store instead.
   *
   * A sample carries its own name, so a second click on the same card is a
   * request to see that sandbox rather than a naming mistake to report: the
   * one already in the namespace is returned instead of an `AlreadyExists`.
   *
   * The catalogue is waited for first. A card is one click, and the gallery is
   * on screen as soon as the namespace resolves, so a quick click can land
   * while the AI catalogue is still in flight - and the agents are only ever
   * injected here, at the moment the sandbox is created.
   */
  createSandboxFromSample:
    (
      sample: SandboxSample,
      customization: SandboxCustomization = NO_CUSTOMIZATION,
      storageType: SandboxStorageType = DEFAULT_STORAGE_TYPE,
    ): AppThunk<Promise<Sandbox | undefined>> =>
    async (dispatch, getState): Promise<Sandbox | undefined> => {
      if (!selectCatalogIsLoaded(getState())) {
        await dispatch(catalogActionCreators.requestCatalog());
      }

      const state = getState();
      const namespace = selectNamespace(state);
      const indexUrl = selectSamplesIndexUrl(state);
      const aiTools = selectAiTools(state);
      const client = getSandboxClient();

      try {
        dispatch(sampleCreateRequestAction(sample.id));

        const yaml = await fetchSampleManifest(indexUrl, sample);
        const manifest = toSandbox(load(yaml), sample.id);
        // The YAML as published is what the Manifest tab shows, so it is kept
        // before the namespace and the agents are layered on top of it.
        // Storage goes on last, over the finished sandbox, as it does in the
        // wizard. A sample that mounts things of its own keeps them: only the
        // volume the dashboard owns is rewritten.
        const desired = withOriginalManifest(
          applyStorage(
            applyCustomization(applySampleOverrides(manifest, namespace), customization, aiTools),
            storageType,
          ),
          yaml,
        );

        let created: Sandbox;
        try {
          created = await client.createSandbox(namespace, desired);
        } catch (e) {
          if (!isAlreadyExistsError(e)) {
            throw e;
          }
          created = await client.getSandbox(namespace, desired.metadata.name);
        }

        dispatch(sampleCreateReceiveAction());
        return created;
      } catch (e) {
        dispatch(sampleCreateErrorAction(toSandboxError(e)));
        return undefined;
      }
    },

  clearSampleCreateError: (): AppThunk<void> => dispatch =>
    dispatch(sampleCreateClearErrorAction()),

  /** Opens the manifest preview and loads the YAML behind the chosen sample. */
  showSampleManifest:
    (sample: SandboxSample): AppThunk =>
    async (dispatch, getState): Promise<void> => {
      const indexUrl = selectSamplesIndexUrl(getState());

      dispatch(sampleManifestRequestAction(sample.id));
      try {
        const manifest = await fetchSampleManifest(indexUrl, sample);
        // The preview may have moved on to another sample, or been closed,
        // while this manifest was in flight.
        if (selectSampleManifestId(getState()) === sample.id) {
          dispatch(sampleManifestReceiveAction(manifest));
        }
      } catch (e) {
        if (selectSampleManifestId(getState()) === sample.id) {
          dispatch(sampleManifestErrorAction(toSandboxError(e)));
        }
      }
    },

  closeSampleManifest: (): AppThunk<void> => dispatch => dispatch(sampleManifestCloseAction()),
};
