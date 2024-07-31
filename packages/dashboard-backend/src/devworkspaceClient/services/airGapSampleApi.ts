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

import { api } from '@eclipse-che/common';
import * as console from 'console';
import * as fs from 'fs';
import path from 'path';

import { IAirGapSampleApi } from '@/devworkspaceClient/types';
import { isLocalRun } from '@/localRun';

// See build/dockerfiles/Dockerfile for the path
const airGapResourcesDir = '/public/dashboard/devfile-registry/air-gap';

export class AirGapSampleApiService implements IAirGapSampleApi {
  async list(): Promise<Array<api.IAirGapSample>> {
    return readAirGapIndex();
  }

  async downloadProject(name: string): Promise<api.IStreamedFile> {
    const sample = readAirGapIndex().find(sample => sample.displayName === name);
    if (sample) {
      return download(sample.project?.zip?.filename);
    }

    throw new Error(`Sample ${name} not found`);
  }

  async downloadDevfile(name: string): Promise<api.IStreamedFile> {
    const sample = readAirGapIndex().find(sample => sample.displayName === name);
    if (sample) {
      return download(sample.devfile?.filename);
    }

    throw new Error(`Sample ${name} not found`);
  }
}

function getAirGapResourcesDir(): string {
  return isLocalRun()
    ? path.join(
        __dirname,
        '../../../dashboard-frontend/lib/public/dashboard/devfile-registry/air-gap',
      )
    : airGapResourcesDir;
}

function getAirGapIndexFilePath(): string {
  return path.join(getAirGapResourcesDir(), 'index.json');
}

function readAirGapIndex(): Array<api.IAirGapSample> {
  const airGapIndexFilePath = getAirGapIndexFilePath();
  if (!fs.existsSync(airGapIndexFilePath)) {
    return [];
  }

  try {
    const data = fs.readFileSync(airGapIndexFilePath, 'utf8');
    return JSON.parse(data) as api.IAirGapSample[];
  } catch (e) {
    console.error(e, 'Failed to read air-gap index.json');
    throw new Error('Failed to read air-gap index.json');
  }
}

function download(filename: string): api.IStreamedFile {
  if (!filename) {
    console.error(`filename not defined`);
    throw new Error(`filename not defined`);
  }

  const filepath = path.resolve(getAirGapResourcesDir(), filename);

  // This is a security check to ensure that the file is within the airGapResourcesDir
  if (!filepath.startsWith(getAirGapResourcesDir())) {
    console.error(`Invalid devfile path ${filepath}`);
    throw new Error(`Invalid devfile path`);
  }

  if (!fs.existsSync(filepath)) {
    console.error(`File not found ${filename}`);
    throw new Error(`File not found`);
  }

  try {
    const stats = fs.statSync(filepath);
    return { stream: fs.createReadStream(filepath), size: stats.size };
  } catch (err) {
    console.error(`Error reading devfile`, err);
    throw new Error(`Error reading devfile`);
  }
}
