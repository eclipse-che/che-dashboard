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

// See build/Dockerfile for the path
const airGapDir = '/public/dashboard/devfile-registry/air-gap';

export class AirGapSampleApiService implements IAirGapSampleApi {
  async list(): Promise<Array<api.IAirGapSample>> {
    return readAirGapIndex();
  }

  async downloadProject(name: string): Promise<api.IStreamedFile> {
    for (const sample of readAirGapIndex()) {
      if (sample.displayName === name) {
        const projectPath = path.resolve(getAirGapDir(), sample.project.zip.filename);
        if (!projectPath.startsWith(getAirGapDir())) {
          throw new Error(`Invalid project path`);
        }

        try {
          const stats = fs.statSync(projectPath);
          return { stream: fs.createReadStream(projectPath), size: stats.size };
        } catch (err) {
          console.error(`Error downloading project`, err);
          throw new Error(`Error downloading project`);
        }
      }
    }

    throw new Error(`Sample not found`);
  }

  async downloadDevfile(name: string): Promise<api.IStreamedFile> {
    for (const sample of readAirGapIndex()) {
      if (sample.displayName === name) {
        const devfilePath = path.resolve(getAirGapDir(), sample.devfile.filename);
        if (!devfilePath.startsWith(getAirGapDir())) {
          throw new Error(`Invalid devfile path`);
        }

        try {
          const stats = fs.statSync(devfilePath);
          return { stream: fs.createReadStream(devfilePath), size: stats.size };
        } catch (err) {
          console.error(`Error reading devfile`, err);
          throw new Error(`Error reading devfile`);
        }
      }
    }

    throw new Error(`Sample not found`);
  }
}

function getAirGapDir(): string {
  return isLocalRun()
    ? path.join(
        __dirname,
        '../../../dashboard-frontend/lib/public/dashboard/devfile-registry/air-gap',
      )
    : airGapDir;
}

function getAirGapIndexFilePath(): string {
  return path.join(getAirGapDir(), 'index.json');
}

function readAirGapIndex(): Array<api.IAirGapSample> {
  const airGapIndexFilePath = getAirGapIndexFilePath();
  if (!fs.existsSync(airGapIndexFilePath)) {
    return [];
  }

  try {
    const data = fs.readFileSync(airGapIndexFilePath, 'utf8');
    const samples = JSON.parse(data) as api.IAirGapSample[];
    return samples.filter(sample => {
      if (!sample.project?.zip?.filename) {
        console.error(`Sample ${sample.displayName} is missing project.zip.filename`);
        return false;
      }

      if (!fs.existsSync(path.resolve(getAirGapDir(), sample.project.zip.filename))) {
        console.error(`File ${sample.project.zip.filename} not found`);
        return false;
      }

      if (!sample.devfile?.filename) {
        console.error(`Sample ${sample.displayName} is missing devfile.filename`);
        return false;
      }

      if (!fs.existsSync(path.resolve(getAirGapDir(), sample.devfile.filename))) {
        console.error(`File ${sample.devfile.filename} not found`);
        return false;
      }

      return true;
    });
  } catch (e) {
    console.error(e, 'Failed to read air-gap index.json');
    throw new Error('Failed to read air-gap index.json');
  }
}
