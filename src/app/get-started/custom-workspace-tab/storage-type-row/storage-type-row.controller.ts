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

import { IStorageTypeRowComponentBindings } from './storage-type-row.component';
import { IChePfSelectProperties } from '../../../../components/che-pf-widget/select/che-pf-select-typeahead.directive';
import { ChePfModalService } from '../../../../components/che-pf-widget/modal/che-pf-modal.service';
import { StorageTypeService, StorageType } from '../../../../components/service/storage-type/storage-type.service';

type OnChangesObject = {
  [key in keyof IStorageTypeRowComponentBindings]: ng.IChangesObject<IStorageTypeRowComponentBindings[key]>;
};

export class StorageTypeRowController implements ng.IController, IStorageTypeRowComponentBindings {

  static $inject = [
    'chePfModalService',
    'storageTypeService',
  ];

  // component bindings
  storageType?: StorageType;
  onChangeStorageType: (eventObj: { '$storageType': StorageType; }) => void;

  // used in template
  selectorId = 'storage-type-selector';

  // template fields
  storageSelect: IChePfSelectProperties<StorageType>;
  descriptionButtonTitle: string;

  // injected services
  private chePfModalService: ChePfModalService;
  private storageTypeService: StorageTypeService;

  private initPromise: ng.IPromise<void>;
  private preferredStorageType: StorageType;
  // indicates that next onChange event should be skipped
  private skipNextChange: boolean;

  constructor(
    chePfModalService: ChePfModalService,
    storageTypeService: StorageTypeService,
  ) {
    this.chePfModalService = chePfModalService;
    this.storageTypeService = storageTypeService;

    this.storageSelect = {
      config: {
        id: this.selectorId,
        default: this.storageType || StorageType.persistent,
        items: [StorageType.persistent],
        placeholder: 'Select a storage template',
        disabled: true,
      },
      value: this.preferredStorageType,
      onSelect: storageType => this.onStorageTypeChanged(storageType),
    };
  }

  $onInit(): void {
    this.descriptionButtonTitle = 'Learn more about storage types';

    this.initPromise = this.storageTypeService.ready
      .then(() => {
        const items = this.storageTypeService.getAvailableTypes()
          .map(type => StorageType[type]);
        this.preferredStorageType = this.storageTypeService.getPreferredType();

        this.storageSelect.config.default = this.preferredStorageType;
        this.storageSelect.config.disabled = items.length === 1;
        this.storageSelect.config.items = items;
      });
  }

  $onChanges(onChangesObj: OnChangesObject): void {
    if (!this.initPromise) {
      return;
    }
    this.initPromise.then(() => {
      if (onChangesObj.storageType.currentValue === undefined) {
        this.storageSelect.value = this.preferredStorageType;
        return;
      }
      if (onChangesObj.storageType.currentValue === this.storageSelect.value) {
        return;
      }
      this.skipNextChange = true;
      this.storageSelect.value = onChangesObj.storageType.currentValue;
    });
  }

  showStorageTypeModal(): ng.IPromise<void> {
    const storageTypes = this.storageTypeService.getAvailableTypes();
    const content = this.storageTypeService.getHtmlDescriptions(storageTypes);
    return this.chePfModalService.showModal(content);
  }

  onStorageTypeChanged(storageType: StorageType): void {
    if (this.skipNextChange) {
      this.skipNextChange = false;
      return;
    }
    this.onChangeStorageType({ '$storageType': storageType })
  }

}
