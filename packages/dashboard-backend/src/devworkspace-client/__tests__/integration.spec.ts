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

import * as k8s from '@kubernetes/client-node';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { DevWorkspaceClient, IDevWorkspaceDevfile, IDevWorkspaceTemplate } from '../';
import { conditionalTest, isIntegrationTestEnabled } from './utils/suite';
import { delay } from './utils/helper';
import { fail } from 'assert';

describe('DevWorkspace API integration testing against cluster', () => {

  describe('Test Node DevWorkspace Api against local cluster', () => {
    conditionalTest('Test run the creation, retrieval, update and deletion of a devworkspace', isIntegrationTestEnabled, async (done: any) => {
      const kc = new k8s.KubeConfig();
      const kubeconfigFile = process.env['KUBECONFIG'];
      if (!kubeconfigFile) {
        throw 'KUBECONFIG must be configured with the valid current context set';
      }
      kc.loadFromFile(kubeconfigFile);

      const dwClient = new DevWorkspaceClient(kc);
      const devfile = yaml.load(fs.readFileSync(__dirname + '/fixtures/sample-devfile.yaml', 'utf-8')) as IDevWorkspaceDevfile;
      const name = devfile.metadata.name;
      const namespace = devfile.metadata.namespace;

      // check that api is enabled
      const isApiEnabled = await dwClient.isDevWorkspaceApiEnabled();
      expect(isApiEnabled).toBe(true);

      // check that the namespace is initialized
      // initialize namespace if it doesn't exist
      await dwClient.cheApi.initializeNamespace(namespace);
      await delay(5000);
      let namespaceExists: boolean;
      if (await (dwClient.cheApi as any).isOpenShift()) {
        namespaceExists = await (dwClient.cheApi as any).doesProjectExist(namespace);
      } else {
        namespaceExists = await (dwClient.cheApi as any).doesNamespaceExist(namespace);
      }
      expect(namespaceExists).toBe(true);

      // check that creation works
      const newDevWorkspace = await dwClient.devworkspaceApi.create(devfile, 'che', true);
      expect(newDevWorkspace.metadata.name).toBe(name);
      expect(newDevWorkspace.metadata.namespace).toBe(namespace);

      // check that retrieval works
      const allWorkspaces = await dwClient.devworkspaceApi.listInNamespace(namespace);
      expect(allWorkspaces.items.length).toBe(1);
      const firstDevWorkspace = allWorkspaces.items[0];
      expect(firstDevWorkspace.metadata.name).toBe(name);
      expect(firstDevWorkspace.metadata.namespace).toBe(namespace);

      const singleNamespace = await dwClient.devworkspaceApi.getByName(namespace, name);
      expect(singleNamespace.metadata.name).toBe(name);
      expect(singleNamespace.metadata.namespace).toBe(namespace);

      await delay(2000);
      const currentDevWorkspace = await dwClient.devworkspaceApi.getByName(namespace, name);
      const sampleRouting = 'sample';
      currentDevWorkspace.spec.routingClass = sampleRouting;

      const updatedWorkspace = await dwClient.devworkspaceApi.update(currentDevWorkspace);
      expect(updatedWorkspace.spec.routingClass).toBe(sampleRouting);

      // check that deletion works
      await dwClient.devworkspaceApi.delete(namespace, name);
      await delay(5000);
      const dwsInNamespace = await dwClient.devworkspaceApi.listInNamespace(namespace);
      var nonTerminatingWsCount = 0;
      for (const dw of dwsInNamespace.items) {
        if (dw.status?.phase !== 'Terminating') {
          nonTerminatingWsCount++;
        }
      }
      expect(nonTerminatingWsCount).toBe(0);
      done();
    }, 60000);

    conditionalTest('Test run the creation, retrieval and deletion of a devworkspace template', isIntegrationTestEnabled, async (done: any) => {
      const kc = new k8s.KubeConfig();
      const kubeconfigFile = process.env['KUBECONFIG'];
      if (!kubeconfigFile) {
        throw 'KUBECONFIG must be configured with the valid current context set';
      }
      kc.loadFromFile(kubeconfigFile);

      const dwClient = new DevWorkspaceClient(kc);
      const dwt = yaml.load(fs.readFileSync(__dirname + '/fixtures/sample-dwt.yaml', 'utf-8')) as IDevWorkspaceTemplate;
      const name = dwt.metadata?.name;
      const namespace = dwt.metadata?.namespace;
      if (!name) {
        fail('namespace is mandatory but missing');
      }
      if (!namespace) {
        fail('namespace is mandatory but missing');
      }

      // check that api is enabled
      const isApiEnabled = await dwClient.isDevWorkspaceApiEnabled();
      expect(isApiEnabled).toBe(true);

      // initialize namespace if it doesn't exist
      await dwClient.cheApi.initializeNamespace(namespace);
      await delay(5000);
      var namespaceExists: boolean;
      if (await (dwClient.cheApi as any).isOpenShift()) {
        namespaceExists = await (dwClient.cheApi as any).doesProjectExist(namespace);
      } else {
        namespaceExists = await (dwClient.cheApi as any).doesNamespaceExist(namespace);
      }
      expect(namespaceExists).toBe(true);

      // check that creation works
      const newDWT = await dwClient.templateApi.create(dwt);
      expect(newDWT.metadata.name).toBe(name);
      expect(newDWT.metadata.namespace).toBe(namespace);

      await delay(5000);

      // check that retrieval works
      const allTemplates = await dwClient.templateApi.listInNamespace(namespace);
      expect(allTemplates.length).toBe(1);
      const firstTemplate = allTemplates[0];
      expect(firstTemplate.metadata.name).toBe(name);
      expect(firstTemplate.metadata.namespace).toBe(namespace);

      const singleNamespace = await dwClient.templateApi.getByName(namespace, name);
      expect(singleNamespace.metadata.name).toBe(name);
      expect(singleNamespace.metadata.namespace).toBe(namespace);

      // check that deletion works
      await dwClient.templateApi.delete(namespace, name);
      await delay(5000);
      const finalNamespaces = await dwClient.templateApi.listInNamespace(namespace);
      expect(finalNamespaces.length).toBe(0);

      done();
    }, 60000);
  });

});
