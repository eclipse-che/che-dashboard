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

import { IWorkspaceNameRowComponentBindings, IWorkspaceNameRowComponentInputBindings } from './workspace-name-row.component';
import { IChePfTextInputProperties } from '../../../../components/che-pf-widget/text-input/che-pf-text-input.directive';
import { RandomSvc } from '../../../../components/utils/random.service';

type OnChangesObject = {
  [key in keyof IWorkspaceNameRowComponentInputBindings]: ng.IChangesObject<IWorkspaceNameRowComponentInputBindings[key]>;
};

const DEFAULT_PLACEHOLDER = 'Enter a workspace name';
const ERROR_REQUIRED_VALUE = 'A value is required.';
const ERROR_PATTERN_MISMATCH = 'The name should not contain special characters like space, dollar, etc., and should start and end only with digits, latin letters or underscores.';

export class WorkspaceNameRowController implements ng.IController, IWorkspaceNameRowComponentBindings {

  static $inject = [
    '$element',
    'randomSvc',
  ];

  // component bindings
  generateName: string;
  name: string;
  onChange: (eventObj: { $name: string }) => void;

  // template fields
  workspaceNameInput: IChePfTextInputProperties;
  required: boolean;
  errorMessage: string;

  // injected services
  private $element: ng.IAugmentedJQuery;
  private randomSvc: RandomSvc;

  constructor(
    $element: ng.IAugmentedJQuery,
    randomSvc: RandomSvc,
  ) {
    this.$element = $element;
    this.randomSvc = randomSvc;

    this.workspaceNameInput = {
      config: {
        name: 'workspaceName',
        placeHolder: DEFAULT_PLACEHOLDER,
        pattern: '^[A-Za-z0-9][A-Za-z0-9_\\-\\.]+[A-Za-z0-9]$',
      },
      onChange: name => this.onChanged(name),
    };
  }

  $onChanges(onChangesObj: OnChangesObject): void {
    // update workspace name value
    if (onChangesObj.name) {
      this.workspaceNameInput.value = onChangesObj.name.currentValue || '';
    }

    // name isn't required if `generateName` is provided
    if (onChangesObj.generateName && onChangesObj.generateName.currentValue) {
      this.required = false;
    } else {
      this.required = true;
    }

    // update placehoder to suggest user if they need to provide a workspace name or it will be generated
    if (onChangesObj.generateName && onChangesObj.generateName.currentValue) {
      this.workspaceNameInput.config.placeHolder = `will be auto-generated with the prefix '${onChangesObj.generateName.currentValue}'`;
    } else {
      this.workspaceNameInput.config.placeHolder = DEFAULT_PLACEHOLDER;
    }
  }

  private onChanged(name: string): void {
    this.onValidated();
    this.onChange({ '$name': name });
  }

  private onValidated(): void {
    const input = this.$element.find('input');
    const validity = (input[0] as HTMLInputElement).validity;

    // hide error messages if valid
    if (validity.valid) {
      delete this.errorMessage;
      input.removeAttr('aria-invalid');
      return;
    }

    if (validity.valueMissing) {
      // show 'required' error message
      this.errorMessage = ERROR_REQUIRED_VALUE;
    }
    if (validity.patternMismatch) {
      // show 'pattern' error message
      this.errorMessage = ERROR_PATTERN_MISMATCH;
    }
    input.attr('aria-invalid', 'true');
  }

}
