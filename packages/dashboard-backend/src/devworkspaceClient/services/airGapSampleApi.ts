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
    return this.readAirGapIndex();
  }

  async downloadProject(name: string): Promise<api.IStreamedFile> {
    const sample = this.readAirGapIndex().find(sample => sample.displayName === name);
    if (sample) {
      return this.download(sample.project?.zip?.filename);
    }

    console.error(`Sample not found: ${name} `);
    throw new Error(`Sample not found`);
  }

  async downloadDevfile(name: string): Promise<api.IStreamedFile> {
    const sample = this.readAirGapIndex().find(sample => sample.displayName === name);
    if (sample) {
      return this.download(sample.devfile?.filename);
    }

    console.error(`Sample not found: ${name} `);
    throw new Error(`Sample not found`);
  }

  getAirGapResourcesDir(): string {
    return isLocalRun()
      ? path.join(
          __dirname,
          '../../../dashboard-frontend/lib/public/dashboard/devfile-registry/air-gap',
        )
      : airGapResourcesDir;
  }

  private getAirGapIndexFilePath(): string {
    return path.join(this.getAirGapResourcesDir(), 'index.json');
  }

  private readAirGapIndex(): Array<api.IAirGapSample> {
    const airGapIndexFilePath = this.getAirGapIndexFilePath();
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

  private download(filename?: string): api.IStreamedFile {
    if (!filename) {
      console.error(`filename not defined`);
      throw new Error(`filename not defined`);
    }

    const filepath = path.resolve(this.getAirGapResourcesDir(), filename);

    // This is a security check to ensure that the file is within the airGapResourcesDir
    if (!filepath.startsWith(this.getAirGapResourcesDir())) {
      console.error(`Invalid file path: ${filepath}`);
      throw new Error(`Invalid file path`);
    }

    if (!fs.existsSync(filepath)) {
      console.error(`File not found: ${filepath}`);
      throw new Error(`File not found`);
    }

    try {
      const stats = fs.statSync(filepath);
      return { stream: fs.createReadStream(filepath), size: stats.size };
    } catch (err) {
      console.error(`Error reading file: ${filepath}`, err);
      throw new Error(`Error reading file`);
    }
  }
}
