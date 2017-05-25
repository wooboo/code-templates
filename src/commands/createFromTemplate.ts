'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { TemplatesManager, TemplateData } from '../templatesManager';

const tm = new TemplatesManager();

const NAME_TOKEN = /__NAME__/g;
const NEW_FILE = 'Files: New File';
const CREATE_TEMPLATE = 'Files: New File Template';
const EDIT_TEMPLATE = 'Files: Edit File Template';
const TEMPLATES_PREFIX = 'Template: ';

function createDir(destination, source, params: TemplateParams, option: TemplateData) {
    fs.mkdir(destination, (err) => {
        fs.readdir(source, (err, files) => {
            files.forEach((file) => {
                var filePath = path.join(source, file);
                if (fs.lstatSync(filePath).isDirectory()) {
                    let newDir = path.basename(file).replace(NAME_TOKEN, params.name)
                    createDir(path.join(destination, newDir), path.join(source, file), params, option);
                } else {
                    fs.readFile(filePath, 'utf8', (err, data) => {
                        if (err) {
                            vscode.window.showErrorMessage('Cannot find the template');
                            return;
                        }

                        let newName = path.basename(file).replace(NAME_TOKEN, params.name);

                        createFile(path.join(destination, newName), data, params, option);
                    });
                }

            });
        });
    });
}
function createFile(destination, data, params: TemplateParams, templateData: TemplateData) {
    data = data.replace(NAME_TOKEN, params.name);
    let newName = path.basename(destination).replace(NAME_TOKEN, params.name);
    let newFilePath = path.join(path.dirname(destination), newName);
    fs.stat(newFilePath, (err, stats) => {

        if (stats && (stats.isFile() || stats.isDirectory())) {
            vscode.window.showErrorMessage('File already exists with the same name. Please retry with another name');
            return;
        }

        fs.writeFile(newFilePath, data, (err) => {
            if (err) {
                vscode.window.showErrorMessage('Cannot create new file');
                return;
            }

            vscode.commands.executeCommand('vscode.open', vscode.Uri.parse('file:///' + newFilePath)).then(() => {
                console.log('Document opened');
            });
        });
    });
}


function constructTemplatesOptions(templatesInfo): TemplateData[] {

    let templateMenuOptions: TemplateData[] = [];
    for (var key in templatesInfo) {
        if (templatesInfo.hasOwnProperty(key)) {
            var element = <TemplateData>templatesInfo[key];
            templateMenuOptions.push(element);
        }
    }

    return templateMenuOptions;
}
interface TemplateParams {
    name: string;
}
function createFromTemplate(destination, source, params: TemplateParams, options: TemplateData) {
    if (fs.lstatSync(source).isDirectory()) {
        createDir(destination, source, params, options);
    } else {
        fs.readFile(source, 'utf8', (err, data) => {
            if (err) {
                vscode.window.showErrorMessage('Cannot find the template');
                return;
            }

            createFile(destination, data, params, options);
        });
    }
}

export default function (...args: any[]) {
    const [info] = args;

    let currentPath = info ? info._fsPath : undefined;
    if (!currentPath) {
        let editor = vscode.window.activeTextEditor;
        if (editor)
            currentPath = editor.document.fileName;

        if (!currentPath)
            currentPath = vscode.workspace.rootPath;

        if (!currentPath)
            return;
    }
    currentPath = fs.statSync(currentPath).isDirectory() ? currentPath : path.dirname(currentPath);

    tm.getTemplates().then(templatesInfo => {
        let templateMenuOptions = constructTemplatesOptions(templatesInfo);
        let select = vscode.window.showQuickPick<TemplateData>(templateMenuOptions, {
            placeHolder: 'Select a template to create from'
        });

        select.then(option => {
            if (!option)
                return;
            let input = vscode.window.showInputBox({
                prompt: 'Enter new name'
            });
            input.then((newName) => {
                const params = { name: newName };
                if (option.template) {
                    createFile(
                        path.join(currentPath, newName + option.extension)
                        , option.template, params, option);
                } else {
                    fs.readdir(option.directory, (err, files) => {
                        files.forEach((file) => {
                            if (path.extname(file)!=='.template' && (file.startsWith(option.name + ".") || file === option.name)) {
                                createFromTemplate(
                                    path.join(currentPath, newName + file.slice(option.name.length)),
                                    path.join(option.directory, file),
                                    params, option);
                            }
                        });
                    });



                }
            });
        });
    });
}