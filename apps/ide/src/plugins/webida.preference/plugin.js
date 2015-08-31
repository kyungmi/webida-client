/*
 * Copyright (c) 2012-2015 S-Core Co., Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * webida.preference plugin main
 *
 * @since: 15. 8. 18
 * @author: Koong Kyungmi (kyungmi.k@samsung.com)
 * @module webida.preference
 */

define([
    'external/lodash/lodash.min',
    'webida-lib/util/logger/logger-client',
    'webida-lib/plugins/workbench/plugin',
    'webida-lib/util/path',
    './preference-manager',
    'plugins/project-configurator/project-info-service'
], function (
    _,
    Logger,
    workbench,
    pathUtil,
    manager,
    projectInfo
) {
    'use strict';
    var MODULE_PATH_VIEW_CTRL = 'plugins/webida.preference/view-controller';
    var logger = new Logger();
    var module = {};

    var workbenchItems = {
        '&Preferences' : ['cmnd', 'plugins/webida.preference/plugin', 'openDialogByWorkspaceScope']
    };

    var workspaceItems = {
        'Preferences' : ['cmnd', 'plugins/webida.preference/plugin', 'openDialogByContext']
    };

    function _getContextInfo(paths){
        var info = {
            multi: false,
            nodeType: 'file'
        };
        if (paths) {
            if (paths.length === 1 && pathUtil.isDirPath(paths[0])) {
                info.nodeType = 'directory';
                var pathSplit = paths[0].split('/');
                if (pathSplit.length === 2) {
                    info.nodeType = 'workspace';
                } else if (pathSplit.length === 3) {
                    if (projectInfo.getByName(pathSplit[2])) {
                        info.projectName = pathSplit[2];
                        info.nodeType = 'project';
                    }
                }
            } else if (paths.length > 1) {
                info.multi = true;
            }
        }
        return info;
    }

    module.getViableItemsForWorkbench = function () {
        return workbenchItems;
    };

    module.getViableItemsForWorkspace = function () {
        var context = _getContextInfo(workbench.getSelectedPaths());
        var viable = !context.multi && (context.nodeType === 'workspace' || context.nodeType === 'project');
        return viable ? workspaceItems : null;
    };

    module.openDialog = function (scope) {
        require([MODULE_PATH_VIEW_CTRL], function (viewController) {
           viewController.openDialog(scope);
        });
    };

    module.openDialogByWorkspaceScope = function () {
        module.openDialog(manager.SCOPE.WORKSPACE);
    };

    module.openDialogByContext = function () {
        var context = _getContextInfo(workbench.getContext());
        var scope = manager.SCOPE.WORKSPACE;
        var info = {};
        if (context.nodeType) {
            if (context.nodeType === 'project') {
                scope = manager.SCOPE.PROJECT;
                info = {projectName: context.projectName};
            }
            module.openDialog(scope, info);
        }
    };

    return module;
});
