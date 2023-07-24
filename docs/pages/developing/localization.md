# Localization

## String Extraction

The IBM i Project Explorer extension uses the VS Code [l10n](https://code.visualstudio.com/api/references/vscode-api#l10n) API to support string localization.

To automatically extract these strings, use the command below which uses the [@vscode/l10n-dev](https://github.com/microsoft/vscode-l10n/tree/main/l10n-dev#vscodel10n-dev) tool. This command will search all TypeScript files in `./src` and generate a `bundle.l10n.json` file in the `./l10n` folder with all the strings to be localized. From there you can create a `bundle.l10n.LOCALE.json` file for each locale you want to support. 

```bash
npm run nls
```

To extract static contributions made in the `package.json`, manually extract these strings to the `package.nls.json` file. From there you can similarly create a `package.nls.LOCALE.json` file for each locale you want to support.

---

## Testing

For testing localization changes, the command below can be used to generate sample localized files with the language code `qps-ploc`. To run the extension using these generated strings, install the [Pseudo Language Language Pack](https://marketplace.visualstudio.com/items?itemName=MS-CEINTL.vscode-language-pack-qps-ploc) and then change to use this locale using the `Configure Display Language` command in the VS Code command palette.

```bash
npm run pseudo-nls
```