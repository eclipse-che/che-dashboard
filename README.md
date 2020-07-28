![CI](https://github.com/eclipse/che-dashboard/workflows/CI/badge.svg)

## About Eclipse Che

Eclipse Che is a next generation Eclipse IDE. This repository is licensed under the Eclipse Public License 2.0. Visit [Eclipse Che's Web site](https://eclipse.org/che/) for feature information or the main [Che assembly repository](https://github.com/eclipse/che) for a description of all participating repositories.

# Eclipse Che Dashboard

## Requirements

- Python `v2.7.x`(`v3.x.x`currently not supported)
- Node.js `v8.x.x` or `v10.x.x`
- yarn `v1.13.0` or higher

## Quick start

```sh
git clone https://github.com/eclipse/che-dashboard.git \
  && cd che-dashboard \
  && yarn \
  && yarn serve
```

Installation instructions for Node.js can be found on the following [link](https://docs.npmjs.com/getting-started/installing-node).

## Running

In order to run the project, the `serve` command is used

```sh
yarn serve
```

It will launch the dev server and then the project can be tested on http://localhost:3000.

By default https://che.openthift.io is used as a remote server.

The argument `--server <url>` may allow to use another server.

Following command provides the 'minified/optimised' version of the application:

```sh
yarn serve:dist
```

This is a good check for testing if the final rendering is OK.

## Tests

The application contains unit tests.

```sh
yarn test
```

Note: before pushing contribution, these tests should always work

# Architecture design

## Typescript

The application is written with the [typescript](https://github.com/microsoft/TypeScript) but the resulting build is Javascript v5 compliant.

## Styling/css

[Stylus](https://github.com/LearnBoost/stylus) is used for produced the final CSS.

Variables, simple syntax, etc is then provided.

## Code convention

### indent

There is a `.editorconfig` file that is indicating the current identation which is

```
indent_style = space
indent_size = 2
```

### syntax

The syntax is checked by `jshint` (through [.jshintrc](./.jshintrc) file)

Also when launching `yarn serve` command, there is a report on each file that may have invalid data.

For example use single quote `'hello'`, no `"double quote"`, use `===` and `!===` and not `==` or `!=`.

### name of the files

Controllers are in files named `[name].controller.ts`

Directives: `[name].directive.ts`

Templates: `[name].html`

Factories: `[name].factory.ts`

Unit test: `[name].spec.ts` (for `my-example.factory.ts` will be named `my-example.spec.ts`)

## source tree

Each 'page' needs to have its own folder which include:

controller, directive, template, style for the page

for a 'list-projects' page, the folder tree will have

```
list-projects
  - list-projects.controller.js
  - list-projects.html
  - list-projects.styl
```

## AngularJS recommendation

As classes are available, the controller will be designed as es6 classes.

All injection required will be done through the constructor by adding also the  static `$inject = ['$toBeInjected'];` line.

Also properties are bound with `this.` scope (so avoid to use $scope in injection as this will be more aligned with AngularJS 2.0 where scope will disappear)

example

```js
/**
 * Defines a controller
 * @author Florent Benoit
 */
class CheToggleCtrl {

  static $inject = ['$http'];

  /**
   * Constructor that is using resource injection
   */
  constructor ($http) {
    this.$http = $http; // to use $http in other methods, use this.$http
    this.selectedValue = 'hello';
  }

  exampleMethod() {
    return this.selectedValue;
  }

}

export default CheToggleCtrl;

```

So, no need to add specific arrays for injection.

By using the this syntax, the controllerAs needs to be used when adding the router view

```js
    .when('/myURL', {
      templateUrl: 'mytemplate.html',
      controller: 'MyClassCtrl',
      controllerAs: 'myCtrl'
    })
```

And then, when there is a need to interact with code of a controller, the `controllerAs` value is used.

```html
 <div>Selected book is {{myCtrl.selectedBook}}</div>
```

Note that as if scope was using, the values are always prefixed.

## Directives

The whole idea is to be able to reuse some 'widgets' when designing HTML pages.

So instead that each page make the design/css for all buttons, inputs, it should be defined in some widget components.

The components are located in the `src/components/widget` folder.

It includes toggle buttons, selector, etc.

## API of Che

Each call to the Che API shouldn't be made directly from the controller of the page.
For that, it has to use Che API factories which are handling the job (with promises operations)

By injecting 'cheAPI' inside a controller, all operations can be called.

for example `cheAPI.getWorkspace().getWorkspaces()` for getting the array of the current workspaces of the user

Mocks are also provided for the Che API, allowing to emulate a real backend for unit tests.

## Configurability

Configurations for User Dashboard could be applied in [product.json](/src/assets/branding/product.json) in `"configuration"` section.

Adding the `"configuration.menu.disabled"` field allows Che Admins to list menu entries they want to hide in the left navigation bar, along with the corresponding routes which will be disabled.

Available values are `"administration"`, `"factories"`,  `"getstarted"`, `"organizations"`, `"stacks"`.

For example,

```json
// product.json
{
  // disables `Organizations` and `Factories` menu items and prevents opening views 
  // with list of available organizations or an organization details
  "configuration": {
    "menu": {
      "disabled": ["organizations", "factories"]
    }
  }
}
```

**Note**: Menu entries also may be disabled by default in [branding.constant.ts](https://github.com/eclipse/che-dashboard/blob/master/src/components/branding/branding.constant.ts#L112-L122). In order to force enable such entries they need to be listed in `"configuration.menu.enabled"` field.

In the case of disabling the `"factories"`, `load factory` routing won't be disabled because it is used for creating a new workspace from the devfile URL. For example, `https://che.openshift.io/f?url=https://raw.githubusercontent.com/eclipse/che/master/devfile.yaml` .

The `"configuration.prefetch"` section allows to define resources that UD should pre-fetch. This section consists of following optional fields:

- `"resources"` is an array of urls to resources to pre-fetch;
- `"cheCDN"` which is Che specific and points to API endpoint that gives resources to pre-fetch,
  e.g. response from `"/api/cdn-support/paths"` on `che.openshift.io` has following structure and each of these entries will be pre-fetched:

  ```json
  [
    {
      "chunk": "che.12debab20b181e07ac86.js",
      "cdn": "https://static.developers.redhat.com/che/theia_artifacts/che.12debab20b181e07ac86.js"
    },
    ...
    {
      "external": "vs/editor/editor.main.css",
      "cdn": "https://cdn.jsdelivr.net/npm/@typefox/monaco-editor-core@0.18.0-next.1/min/vs/editor/editor.main.css"
    },
    ...
  ]
  ```

The `"configuration.features.disabled"` field defines features that should be disabled and not displayed in User Dashboard. Available values are `"workspaceSharing"`, `"kubernetesNamespaceSelector"`.

For example, this config disables kubernetes namespace selector:

```json
{
  "configuration": {
    "features": {
      "disabled": ["kubernetesNamespaceSelector"]
    }
  }
}
```
