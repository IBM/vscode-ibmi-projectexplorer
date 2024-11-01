# Migrate Source

A quick and easy way to get started with local development is to begin with migrating source from QSYS. This source migrating process leverages the `cvtsrcpf` command in `makei` as a source code conversion tool. This command essentially converts all members in a given source physical file to properly encoded, terminated, and named source files in an IFS directory. Following this conversion, the files will be bundled into a tar file which will be downloaded and extracted into the project so that you can begin with local development.

?> To learn more about this source code conversion tool, check out the documentation on [cvtsrcpf](https://ibm.github.io/ibmi-bob/#/cli/makei?id=cvtsrcpf).

## Start the Source Migration

To begin the source migration process, first ensure that you have a workspace folder opened with an `iproj.json` file. If you are creating a new project, follow the steps [here](pages/projectExplorer/create-new-project?id=create-new-project) which outline how this file can be created.

Now that your workspace folder is recognized as an IBM i project, browse for the library containing the source physical files you would like to migrate using the **Object Browser** view. Once you have found the desired library, use the **Migrate Source** action. This can also be done on any library in the **Project Explorer** view.

![Migrate Source](../../assets/ProjectExplorer_37.png)

## Configure Settings

This action will pop up a form in the editor for you to configure the migration process. The source library will be prefilled along with the workspace folder to which the files are to be downloaded to. By default, this will be the workspace folder associated with the active project, but this can be changed if you wish to download the files to a different project.

Besides moving the content of the members into stream files, it is important to represent other metadata associated with a SRC-PF. This can be configured under the Settings tab. The migrated streamfiles will be encoded as UTF-8 which can handle all national characters. However the appropriate EBCDIC CCSID is required by the compiler when creating the target object. The SRC-PF CCSID is typically remembered in the `.ibmi.json` file. An optional CCSID value can be used when the source physical file is 65535, since that is ambiguous and not a valid `TGTCCSID` parameter value. If not specified, the `*JOB` CCSID will be used. 

The other piece of metadata associated with the member is the 50 character member text, which is used by the compiler as the object text description. The options is given to import member text as a comment at the top of the source code. Build frameworks such as BOB or ARCAD know how to retrieve the member text from there and use it in the compile command's `TEXT` parameter. Finally, there is an option to generate source file names in lowercase.

![Configure Settings for Migrate Source](../../assets/ProjectExplorer_38.png)

## Enable Clean Up

As part of this source migration process, you can enable the use of another extension called [Source Orbit](https://marketplace.visualstudio.com/items?itemName=IBM.vscode-sourceorbit) to assist with cleaning up the migrated code. This extension offers the ability to automatically rename the migrated source to have the correct extensions required for most build tools, fix all include/copy directives to use Unix style paths instead of member styled paths, and generate the Rules.mk files used by [Bob](https://ibm.github.io/ibmi-bob/#/).

![Clean Up for Migrate Source](../../assets/ProjectExplorer_39.png)

> [!NOTE]
>
> The use of these features requires the **Source Orbit** extension to be installed which can be done from the Visual Studio Code Marketplace: [Source Orbit](https://marketplace.visualstudio.com/items?itemName=IBM.vscode-sourceorbit).

?> To learn more about this clean up process, check out the documentation on [Source Orbit](https://ibm.github.io/sourceorbit/#/./pages/cli/index?id=cleanup-capabilities).

## Select Source Files

The last step in this process is to select the source physical files in the library which you would like to migrate. Once this is done, select the **Migrate Source** button at the bottom to initiate the process.

![Select Source Files for Migrate Source](../../assets/ProjectExplorer_40.png)