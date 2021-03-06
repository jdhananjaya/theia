/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import * as path from 'path';
import * as temp from 'temp';
import * as fs from 'fs-extra';
import * as assert from 'assert';
import { InstallationParam, InstallationResult } from "../common/extension-protocol";
import extensionNodeTestContainer from './test/extension-node-test-container';
import { ApplicationProject } from './application-project';

process.on('unhandledRejection', (reason, promise) => {
    throw reason;
});

let appProjectPath: string;
let appProject: ApplicationProject;

export async function assertInstallation(expectation: {
    installed?: string[],
    uninstalled?: string[]
}): Promise<void> {
    const waitForWillInstall = new Promise<InstallationParam>(resolve => appProject.onWillInstall(resolve));
    const waitForDidInstall = new Promise<InstallationResult>(resolve => appProject.onDidInstall(resolve));

    await waitForWillInstall;
    const result = await waitForDidInstall;

    if (expectation.installed) {
        for (const extension of expectation.installed) {
            assert.equal(true, fs.existsSync(path.resolve(appProjectPath, 'node_modules', extension)), extension + ' is not installed');
        }
    }
    if (expectation.uninstalled) {
        for (const extension of expectation.uninstalled) {
            assert.equal(false, fs.existsSync(path.resolve(appProjectPath, 'node_modules', extension)), extension + ' is not uninstalled');
        }
    }
    assert.equal(true, fs.existsSync(path.resolve(appProjectPath, 'lib', 'bundle.js')), 'the bundle is not generated');
    assert.equal(false, result.failed, 'the installation is failed');
}

describe("application-project", function () {

    beforeEach(function () {
        this.timeout(50000);

        const dir = path.resolve(__dirname, '..', '..', 'application-project-test-temp');
        fs.ensureDirSync(dir);
        appProjectPath = temp.mkdirSync({ dir });
        appProject = extensionNodeTestContainer({
            projectPath: appProjectPath,
            npmClient: 'yarn',
            autoInstall: false
        }).get(ApplicationProject);
    });

    afterEach(function () {
        this.timeout(50000);
        appProject.dispose();
        fs.removeSync(appProjectPath);
    });

    it("install", async function () {
        this.timeout(1800000);

        await fs.writeJSON(path.resolve(appProjectPath, 'package.json'), {
            "private": true,
            "dependencies": {
                "@theia/core": "0.1.1",
                "@theia/filesystem": "0.1.1"
            }
        });
        appProject.scheduleInstall();
        await assertInstallation({
            installed: ['@theia/core', '@theia/filesystem']
        });

        await fs.writeJSON(path.resolve(appProjectPath, 'package.json'), {
            "private": true,
            "dependencies": {
                "@theia/core": "0.1.1"
            }
        });
        appProject.scheduleInstall();
        await assertInstallation({
            installed: ['@theia/core'],
            uninstalled: ['@theia/filesystem']
        });
    });

});
