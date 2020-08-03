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
import { StorageType } from '../../../../components/service/storage-type/storage-type.service';
import { CheBranding } from '../../../../components/branding/che-branding';

type OnChangeObject = {
  [key in keyof IGetStartedToolbarComponentInputBindings]: ng.IChangesObject<IGetStartedToolbarComponentInputBindings[key]>;
};

export class GetStartedToolbarController implements IGetStartedToolbarComponentBindings {

  static $inject = [
    '$filter',
    'cheBranding',
  ];

  // component bindings
  ephemeralMode: boolean;
  devfiles: IDevfileMetaData[];
  onFilterChange: (eventObj: { $filtered: IDevfileMetaData[] }) => void;
  onStorageTypeChange: (eventObj: { $storageType: StorageType }) => void;

  filterInput: IChePfTextInputProperties;
  filterResultsCount: number;
  tmpStorage: IChePfSwitchProperties;
  filteredDevfiles: Array<IDevfileMetaData> = [];
  selectedDevfile: IDevfileMetaData | undefined;
  tooltipContent: string;

  // injected services
  private $filter: ng.IFilterService;
  private cheBranding: CheBranding;

  constructor(
    $filter: ng.IFilterService,
    cheBranding: CheBranding,
  ) {
    this.$filter = $filter;
    this.cheBranding = cheBranding;

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
      onChange: ephemeralOn => this.storageTypeChange(ephemeralOn)
    };

    this.tooltipContent = `Temporary Storage allows for faster I/O but may have
      limited storage and is not persistent.
      <br/>
      <a target="_blank" href="${this.cheBranding.getDocs().storageTypes}">Open documentation page</a>`;
  }

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

    this.onFilterChange({ $filtered: this.filteredDevfiles });
  }

  private storageTypeChange(ephemeralOn: boolean): void {
    const storageType = ephemeralOn ? StorageType.ephemeral : StorageType.persistent;
    this.onStorageTypeChange({ $storageType: storageType });
  }

}
