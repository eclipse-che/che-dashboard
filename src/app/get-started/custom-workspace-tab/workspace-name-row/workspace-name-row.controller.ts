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

type OnChangesObject = {
  [key in keyof IWorkspaceNameRowComponentInputBindings]: ng.IChangesObject<IWorkspaceNameRowComponentInputBindings[key]>;
};

const MIN_LENGTH = 3;
const MAX_LENGTH = 100;
const DEFAULT_PLACEHOLDER = 'Enter a workspace name';
const ERROR_REQUIRED_VALUE = 'A value is required.';
const ERROR_MIN_LENGTH = `The name has to be at least ${MIN_LENGTH} characters long.`;
const ERROR_MAX_LENGTH = `The name is too long. The maximum length is ${MAX_LENGTH} characters.`;
const ERROR_PATTERN_MISMATCH = 'The name can contain digits, latin letters, underscores and it should not contain special characters like space, dollar, etc. It should start and end only with digit or latin letter.';

export class WorkspaceNameRowController implements ng.IController, IWorkspaceNameRowComponentBindings {

  static $inject = [
    '$element',
    '$scope',
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
  private $scope: ng.IScope;

  constructor(
    $element: ng.IAugmentedJQuery,
    $scope: ng.IScope,
  ) {
    this.$element = $element;

    const patternMaxLength = MAX_LENGTH - 2;
    this.workspaceNameInput = {
      config: {
        name: 'workspaceName',
        placeHolder: DEFAULT_PLACEHOLDER,
        pattern: `^(?:[a-zA-Z0-9][-_.a-zA-Z0-9]{1,${patternMaxLength}}[a-zA-Z0-9])?$`,
        minLength: MIN_LENGTH,
        maxLength: MAX_LENGTH,
      },
      onChange: name => this.onChanged(name),
    };

    // workaround to trigger validation after changing workspace name in devfile editor
    $scope.$watch(() => {
      return $element.find(`input[name="${this.workspaceNameInput.config.name}"]`).val();
    }, (newName) => {
      if (newName) {
        this.onValidated(true);
      }
    });
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

  private findInput(): HTMLInputElement | undefined {
    const input = this.$element.find('input');
    if (!input[0]) {
      return;
    }
    return input[0] as HTMLInputElement;
  }

  private onChanged(name: string): void {
    this.onValidated();
    this.onChange({ '$name': name });
  }

  private onValidated(doCheckValidity = false): void {
    const jqInput = this.$element.find('input');

    const input = this.findInput();
    if (!input) {
      return;
    }

    let tooShort = false;
    let tooLong = false;
    if (doCheckValidity) {
      input.checkValidity();

      // workaround to show correct validation message
      if (jqInput.val().toString().length < MIN_LENGTH) {
        tooShort = true;
      } else if (jqInput.val().toString().length > MAX_LENGTH) {
        tooLong = true;
      }
    }

    const validity = input.validity;

    // hide error messages if valid
    if (validity.valid) {
      delete this.errorMessage;
      jqInput.removeAttr('aria-invalid');
      return;
    }

    if (validity.valueMissing) {
      // show 'required' error message
      this.errorMessage = ERROR_REQUIRED_VALUE;
    }
    else if (validity.tooShort || tooShort) {
      // show 'minlength' error message
      this.errorMessage = ERROR_MIN_LENGTH;
    }
    else if (validity.tooLong || tooLong) {
      // show 'maxlength' error message
      this.errorMessage = ERROR_MAX_LENGTH;
    }
    else if (validity.patternMismatch) {
      // show 'pattern' error message
      this.errorMessage = ERROR_PATTERN_MISMATCH;
    }
    jqInput.attr('aria-invalid', 'true');
  }

}
