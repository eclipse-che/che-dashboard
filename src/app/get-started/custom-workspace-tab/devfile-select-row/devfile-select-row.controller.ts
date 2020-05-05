/*
 * Copyright (c) 2015-2018 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */
'use strict';

import { IDevfileSelectRowComponentBindings } from './devfile-select-row.component';
import { IChePfSelectProperties, IChePfSelectItem } from '../../../../components/che-pf-widget/select/che-pf-select-typeahead.directive';
import { IDevfileMetaData, DevfileRegistry } from '../../../../components/api/devfile-registry.factory';
import { IChePfTextInputProperties } from '../../../../components/che-pf-widget/text-input/che-pf-text-input.directive';
import { IChePfButtonProperties } from '../../../../components/che-pf-widget/button/che-pf-button';
import { CheWorkspace } from '../../../../components/api/workspace/che-workspace.factory';
import { CheNotification } from '../../../../components/notification/che-notification.factory';
import { CheFactory } from '../../../../components/api/che-factory.factory';

const ERROR_TYPE_MISMATCH = 'The URL is not valid';

export class DevfileSelectRowController implements IDevfileSelectRowComponentBindings {

  static $inject = [
    '$element',
    '$log',
    '$q',
    'cheFactory',
    'cheNotification',
    'cheWorkspace',
    'devfileRegistry',
  ];

  // component bindings
  onLoad: (eventObj: { $devfile: che.IWorkspaceDevfile, $stackName: string }) => void;
  onError: (eventObj: { $error: string }) => void;
  onClear: () => void;

  // template fields
  devfileSelect: IChePfSelectProperties<IDevfileMetaData>;
  devfileUrlInput: IChePfTextInputProperties;
  devfileLoadButton: IChePfButtonProperties;
  errorMessage: string;

  // injected services
  private $element: ng.IAugmentedJQuery;
  private $log: ng.ILogService;
  private $q: ng.IQService;
  private cheFactory: CheFactory;
  private cheNotification: CheNotification;
  private cheWorkspace: CheWorkspace;
  private devfileRegistry: DevfileRegistry;

  private devfileUrl: string;

  constructor(
    $element: ng.IAugmentedJQuery,
    $log: ng.ILogService,
    $q: ng.IQService,
    cheFactory: CheFactory,
    cheNotification: CheNotification,
    cheWorkspace: CheWorkspace,
    devfileRegistry: DevfileRegistry,
  ) {
    this.$element = $element;
    this.$log = $log;
    this.$q = $q;
    this.cheFactory = cheFactory;
    this.cheNotification = cheNotification;
    this.cheWorkspace = cheWorkspace;
    this.devfileRegistry = devfileRegistry;

    this.devfileUrlInput = {
      config: {
        name: 'devfileUrl',
        placeHolder: 'URL of devfile',
        pattern: 'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+',
      },
      value: '',
      onChange: url => this.onDevfileUrlChanged(url),
    };
    this.devfileLoadButton = {
      title: 'Load devfile',
      onClick: () => {
        // clear devfile-select
        delete this.devfileSelect.value;

        this.loadDevfile(this.devfileUrl)
          .then(devfile => this.onFetched(devfile, this.devfileUrl))
          .catch(() => {
            const error = 'Load devfile failed.';
            this.errorMessage = error;
            this.onError({ $error: error });
          });
      },
    };
    this.devfileSelect = {
      config: {
        items: [],
        placeholder: 'Select a devfile template',
      },
      onSelect: devfileMetaData => {
        // clear devfile-url
        this.devfileUrlInput.value = '';
        this.devfileUrl = '';
        delete this.errorMessage;
        const stackName = devfileMetaData.displayName;
        this.fetchDevfile(devfileMetaData)
          .then(devfile => this.onFetched(devfile, stackName));
      },
    };
  }

  get devfileLoadButtonDisabled(): boolean {
    return !this.devfileUrl;
  }

  $onInit(): void {
    this.cheWorkspace.fetchWorkspaceSettings()
      .then(settings => settings && settings.cheWorkspaceDevfileRegistryUrl)
      .then(devfileRegistryUrl => {
        if (!devfileRegistryUrl) {
          return this.$q.reject();
        }
        return this.devfileRegistry.fetchDevfiles(devfileRegistryUrl);
      })
      .catch(() => {
        const message = 'Failed to load the devfile registry URL.';
        this.cheNotification.showError(message);
        this.$log.error(message);
        return [];
      })
      .then(devfiles => this.updateDevfileSelect(devfiles));
  }

  private updateDevfileSelect(devfiles: IDevfileMetaData[]): void {
    const items: IChePfSelectItem[] = devfiles.map(devfile => [devfile.displayName, devfile]);

    this.devfileSelect.config.items = items;
    this.devfileSelect.config.disabled = items.length === 0;
  }

  private fetchDevfile(devfileMetaData: IDevfileMetaData): ng.IPromise<che.IWorkspaceDevfile> {
    return this.devfileRegistry.fetchDevfile(devfileMetaData.location, devfileMetaData.links.self);
  }

  private onDevfileUrlChanged(url: string): void {
    this.devfileUrl = url;

    const devfileUrlInput = this.$element.find(`input[name="${this.devfileUrlInput.config.name}"]`);
    const validity = (devfileUrlInput[0] as HTMLInputElement).validity;

    if (validity.valid) {
      delete this.errorMessage;
      devfileUrlInput.removeAttr('aria-invalid');
    } else {
      this.errorMessage = ERROR_TYPE_MISMATCH;
      devfileUrlInput.attr('aria-invalid', 'true');
    }
  }

  private loadDevfile(url: string): ng.IPromise<che.IWorkspaceDevfile> {
    return this.cheFactory.fetchDevfile(url);
  }

  private onFetched(devfile: che.IWorkspaceDevfile, stackName: string): void {
    this.onLoad({
      $devfile: devfile,
      $stackName: stackName,
    });
  }

}
