## About Eclipse Che

Eclipse Che is a next generation Eclipse IDE. This repository is licensed under the Eclipse Public License 2.0. Visit [Eclipse Che's Web site](https://eclipse.org/che/) for feature information or the main [Che assembly repository](https://github.com/eclipse/che) for a description of all participating repositories.

# Eclipse Che Dashboard

## Requirements

- Node.js `v10.x.x` and later.
- yarn `v1.20.0` or higher.

**Note**:
Below you can find installation instructions
- [Node.js](https://docs.npmjs.com/getting-started/installing-node)
- [yarn](https://yarnpkg.com/lang/en/docs/install/)

## Quick start

```sh
docker build . -f apache.Dockerfile -t quay.io/che-incubator/che-dashboard-next:next
```

## Running

Install all dependencies:

```sh
yarn
```

and start dev-server:

```sh
yarn start
```

The development server serves the project on [http://localhost:3000](http://localhost:3000).
By default it proxies all API requests to [che.openshift.io](https://che.openshift.io). You can change this behavior providing your own proxy target url and port using the following command as an example:

```sh
yarn start --env.server=https://che-che.192.168.99.100.nip.io  --port=3333
```

For better debugging experience you need to have React and Redux Developer Tools installed in your browser.

## License tool

It uses [dash-licenses](https://github.com/eclipse/dash-licenses) to check all dependencies (including transitive) to be known to Eclipse IPZilla or ClearlyDefined. It generates `.deps/dev.md` and `.deps/prod.md` that contains such information.

Firstly, build the license-tool dockerfile:

```sh
yarn licenseCheck:prepare
```

and then run the license-tool:

```sh
yarn licenseCheck:run
```

## Branding

Default branding data for the User Dashboard is located in [branding.constant.ts](src/services/bootstrap/branding.constant.ts)#BRANDING_DEFAULT. It can be overridden without re-building the project in [product.json](/assets/branding/product.json) file which should contain only values that should overwrite default ones.

### Configurability

Field `"configuration.cheCliTool"` should contain the name of a CLI tool that is recommended to be used to work with Che Server from the terminal. It's the `"chectl"` by default.

Example:

```json
{
  "configuration": {
    "cheCliTool": "chectl"
  }
}
```

## License

Che is open sourced under the Eclipse Public License 2.0.
