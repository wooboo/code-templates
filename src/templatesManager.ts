'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

const templatesDir = path.join(__dirname, 'templates');
const workspaceTemplatesDir = vscode.workspace.rootPath ? path.join(vscode.workspace.rootPath, '.vscode', 'templates') : '';

function createTemplatesDirIfNotExists() {
    return new Promise((resolve, reject) => {
        fs.stat(templatesDir, (err, stats) => {
            if (err || !stats.isDirectory())
                fs.mkdir(templatesDir, () => {
                    resolve();
                });
            else
                resolve();
        });
    });
}
function getFileNameWithoutExtension(file: string) {
    var basename = path.basename(file);
    var ext = path.extname(basename);
    return basename.slice(0, -ext.length);
}
function readDir(directory: string): Thenable<any> {
    return new Promise((resolve, reject) => {
        fs.readdir(directory, (err, files) => {
            if (err) {
                reject(err);
                return;
            }
            const response = {};
            files.forEach(file => {
                if (path.extname(file) === '.template') {
                    const data = fs.readFileSync(path.join(directory, file), 'utf8');

                    const obj = <TemplateData>JSON.parse(data);
                    obj.name = getFileNameWithoutExtension(file);
                    obj.directory = directory;
                    response[obj.name] = obj;
                }
            });
            resolve(response);
        });

    });
}

export interface TemplateData {
    label: string;
    description: string;
    name: string;
    template?: string;
    extension?: string;
    directory: string;
}

export class TemplatesManager {
    getTemplates(): Thenable<{}> {
        return new Promise((resolve, reject) => {
            let templates = {};

            createTemplatesDirIfNotExists().then(() => {
                readDir(templatesDir).then((data) => {
                    templates = { ...templates, ...data };

                    if (workspaceTemplatesDir) {
                        readDir(workspaceTemplatesDir, ).then((data) => {
                            templates = { ...templates, ...data };
                            resolve(templates);
                        });
                    } else {
                        resolve(templates);
                    }
                });
            });
        });

    }
    getTemplatePath(templateName) {
        return path.join(templatesDir, templateName);
    }

    getTemplateURI(templatePath) {
        return vscode.Uri.parse('file:///' + templatePath);
    }
}
