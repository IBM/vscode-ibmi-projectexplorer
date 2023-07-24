# Getting Started

## Project Structure

The IBM i Project Explorer has the following notable directories for development:

- `src` contains the Typescript code
  - `testing` contains the test framework and suites
- `l10n` contains the set of strings found in all Typescript files for translation purposes
- `schema` contains the schemas contributed by the extension
- `types` contains the type definitions for the exported API
- `docs`: contains the documentation

To learn more about VS Code's extension anatomy, check out their [documentation](https://code.visualstudio.com/api/get-started/extension-anatomy).

## Developing and Debugging

1. Install VS Code and Node.js
2. Clone this repository
3. `npm install`
4. `Run Extension` from VS Code

## Packaging

To package the VS Code extension as a `.vsix` file, use the [vsce](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#vsce) CLI tool:

```bash
vsce package
```

Install the `.vsix` from the **Extensions** view in VS Code.

![Install from .vsix](../../assets/Developing_01.png)

## Testing

To run the tests, start debugging the **Extension Tests** configuration.

![Run Extension Tests](../../assets/Developing_02.png)

After the Extension Development Host is launched, connect to a system where the tests will run. After connecting, the tests will start running automatically. The tests being executed along with the results can be seen in the **Test Cases** view. This information is also outputed to the **Debug Console**.

![Tests Cases view](../../assets/Developing_03.png)