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
import * as fs from 'fs';
import path from 'path';

import { IAirGappedSampleApi } from '@/devworkspaceClient/types';
import { logger } from '@/utils/logger';

const airGappedSamplesPath = '/public/dashboard/devfile-registry/devfiles/airgap.json';
const airGappedProjectsRootDir = '/public/dashboard/devfile-registry/devfiles/airgap-projects';

export class AirGappedSampleApiService implements IAirGappedSampleApi {
  async list(): Promise<Array<api.IAirGappedSample>> {
    if (!fs.existsSync(airGappedSamplesPath)) {
      return [];
    }

    try {
      const data = fs.readFileSync(airGappedSamplesPath, 'utf8');
      return JSON.parse(data) as api.IAirGappedSample[];
    } catch (e) {
      logger.error(e, 'Failed to read air-gapped samples');
      return [];
    }
  }

  download(name: string): Promise<IAirGappedProject> {
    const data = fs.readFileSync(airGappedSamplesPath, 'utf8');
    const samples = JSON.parse(data) as api.IAirGappedSample[];

    for (const sample of samples) {
      if (sample.displayName === name) {
        const projectFileName = sample.project?.zip?.filename;
        if (!projectFileName) {
          throw new Error(`Project location is not defined for ${name}`);
        }

        const projectPath = path.resolve(airGappedProjectsRootDir, projectFileName);
        if (!fs.existsSync(projectPath)) {
          throw new Error(`Project path not found: ${projectPath}`);
        }

        try {
          const stats = fs.statSync(projectPath);
          return { stream: fs.createReadStream(projectPath), size: stats.size };
        } catch (err) {
          console.error(`Error downloading sample: ${name}`, err);
          throw new Error(`Error downloading sample: ${name}`);
        }
      }
    }

    throw new Error(`Sample ${name} not found`);
  }
}
