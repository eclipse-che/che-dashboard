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

import { IDevfileMetaData } from '../../../../components/api/devfile-registry.factory';
import { IChePfTextInputProperties } from '../../../../components/che-pf-widget/text-input/che-pf-text-input.directive';
import { IChePfSwitchProperties } from '../../../../components/che-pf-widget/switch/che-pf-switch.directive';
import { IGetStartedToolbarComponentInputBindings, IGetStartedToolbarComponentBindings } from './get-started-toolbar.component';
import { IChePfSelectProperties } from '../../../../components/che-pf-widget/select/che-pf-select-typeahead.directive';
import { STORAGE_TYPE } from '../../../../components/api/storage-type';

type OnChangeObject = {
  [key in keyof IGetStartedToolbarComponentInputBindings]: ng.IChangesObject<IGetStartedToolbarComponentInputBindings[key]>;
};

export class GetStartedToolbarController implements IGetStartedToolbarComponentBindings {

  static $inject = [
    '$filter'
  ];

  // component bindings
  ephemeralMode: boolean;
  devfiles: IDevfileMetaData[];
  onFilterChange: (eventObj: {$filtered: IDevfileMetaData[]}) => void;
  onEphemeralModeChange: (eventObj: {$ephemeralMode: boolean}) => void;
  storageType: string
  onChangeStorageType: (eventObj: { $storageType: string }) => void;
  private storageDescription: string;

  filterInput: IChePfTextInputProperties;
  filterResultsCount: number;
  tmpStorage: IChePfSwitchProperties;
  storageSelect: IChePfSelectProperties<string>;
  filteredDevfiles: Array<IDevfileMetaData> = [];
  selectedDevfile: IDevfileMetaData | undefined;

  // injected services
  private $filter: ng.IFilterService;

  constructor(
    $filter: ng.IFilterService,
  ) {
    this.$filter = $filter;

    this.filterInput = {
      config: {
        name: 'filter-field',
        placeHolder: 'Filter by'
      },
      onChange: filterBy => this.filterDevfiles(filterBy),
    };

    this.tmpStorage = {
      config: {
        name: 'temporary-storage-switch'
      },
      onChange: mode => this.changeEphemeralMode(mode)

    };

    this.storageSelect = {
      config: {
        items: [STORAGE_TYPE.PERSISTENT.label, STORAGE_TYPE.EPHEMERAL.label, STORAGE_TYPE.ASYNCHRONOUS.label],
        placeholder: 'Select a storage template'
      },
      value: STORAGE_TYPE.EPHEMERAL.label,
      onSelect: value => {
        console.log(value)
        this.onSelected(value)
      },
    };
  }
  onStorageTypeChange: (eventObj: { $storageType: string; }) => void;

  $onChanges(onChangesObj: OnChangeObject): void {
    if (onChangesObj.devfiles && onChangesObj.devfiles.currentValue) {
      this.filterDevfiles();
    }
  }

  private filterDevfiles(filterBy?: string): void {
    if (!filterBy) {
      filterBy = '';
    }
    const value = filterBy.toLocaleLowerCase();
    this.filteredDevfiles = this.$filter('filter')(this.devfiles, devfile => {
      return devfile.displayName.toLowerCase().includes(value) || devfile.description.toLowerCase().includes(value);
    });
    if (this.filteredDevfiles.findIndex(devfile => devfile === this.selectedDevfile) === -1) {
      this.selectedDevfile = undefined;
    }
    this.filterResultsCount = this.filteredDevfiles.length;

    this.onFilterChange({$filtered: this.filteredDevfiles});
  }

  private changeEphemeralMode(mode: boolean): void {
    this.onEphemeralModeChange({ $ephemeralMode: mode });
  }


  private async  onSelected(value: string) {
    this.storageType = value;
    switch (value) {
      case STORAGE_TYPE.EPHEMERAL.label:
        this.storageType = value;
        this.storageDescription = STORAGE_TYPE.EPHEMERAL.description;
        break;
      case STORAGE_TYPE.PERSISTENT.label:
        this.storageDescription = STORAGE_TYPE.PERSISTENT.description;
        break;
      case STORAGE_TYPE.ASYNCHRONOUS.label:
        this.storageDescription = STORAGE_TYPE.ASYNCHRONOUS.description;
        break;
    }
    this.onStorageTypeChange({ '$storageType': value});
  }

}
