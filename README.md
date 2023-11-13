# IBM i Project Explorer

[GitHub star this repo 🌟](https://github.com/IBM/vscode-ibmi-projectexplorer)

<img src="./icon.png" align="right" width="256" height="256">

The IBM i Project Explorer supports developing IBM i applications using buildable local projects in Visual Studio Code. Leverage the Project Explorer viewer to manage a project's library list, variables, object libraries, include paths, and much more. Utilize the Job Log viewer as well to easily visualize the contents of your job logs after having run a build or compile.

- 💻 [Install from Marketplace](https://marketplace.visualstudio.com/items?itemName=IBM.vscode-ibmi-projectexplorer)
- 📖 [View documentation](https://ibm.github.io/vscode-ibmi-projectexplorer) 
- 🔎 [See releases](https://github.com/IBM/vscode-ibmi-projectexplorer/releases)
- 🛠 [Use our Project Explorer API](https://ibm.github.io/vscode-ibmi-projectexplorer/#/pages/developing/api)

---

### Running the Extension

1. Install VS Code and Node.js
2. Clone this repository
3. `npm install`
4. `Run Extension` from VS Code

### To release the extension
1. Update `CHANGELOG.md` with the improvements
2. Update the version number in `package.json` and `types/package.json`
3. Create a new release with a tag with the corresponding version number
A github action will automatically be triggered which will build and pubish the vsix to 
both OpenVSX and Micrsoft registries.  Also the types will be published to `npmjs` so that
the API is available to any JavaScript code.