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
 *
 * @since: 15. 8. 18
 * @author: Koong Kyungmi (kyungmi.k@samsung.com)
 */

define([
    'external/lodash/lodash.min',
    'webida-lib/util/logger/logger-client',
    'webida-lib/app',
    'webida-lib/app-config',
    'webida-lib/plugin-manager-0.1',
    './preference-store',
    'plugins/project-configurator/project-info-service'
], function (
    _,
    Logger,
    ide,
    conf,
    pluginManager,
    Store,
    projectService
) {
    'use strict';

    var logger = new Logger();

    var _preferenceManager;

    var fsCache = ide.getFSCache();

    var EXTENSION_NAME = 'webida.preference:pages';
    var PREF_FILE_NAME = '.preferences';
    var SCOPE = Object.freeze({
        USER: {
            scope: 'USER',
            priority: 1,
            root: '/',
            path: conf.meta.user.dir + '/' + PREF_FILE_NAME
        },
        WORKSPACE: {
            scope: 'WORKSPACE',
            priority: 2,
            root: ide.getPath() + '/',
            path: conf.meta.workspace.dir + '/' + PREF_FILE_NAME
        },
        PROJECT: {
            scope: 'PROJECT',
            priority: 3,
            template: function (callback) {
                return projectService.getAll(function (projects) {
                    callback(projects.map(function (value) {
                        return {projectName: value.name};
                    }));
                });
            },
            root: ide.getPath() + '/<%=projectName%>/',
            path: conf.meta.project.dir + '/' + PREF_FILE_NAME
        }
    });

    function PreferenceManager() {
        this.SCOPE = SCOPE;
        this.preferences = [];
        this.extensions = [];

        var self = this;

        function fillStoreValues(scope, extension, template) {
            return new Promise(function (resolve, reject) {
                var filePath = scope.root + scope.path;
                if (template) {
                    filePath = _.template(filePath)(template);
                }
                logger.info('[Preference] fillStoreValues', scope.name, extension.id, template, filePath);
                var store = new Store(extension.id, scope.name, filePath);
                store.defaultValues = extension.defaultValues;
                self.preferences.push(store);

                fsCache.readFile(filePath, function (err, content) {
                    if (err) {
                        logger.warn('[Preference] Read file error: ' + filePath, err);
                    } else {
                        try {
                            var prefFromFile = JSON.parse(content);
                            store.appliedValues = prefFromFile[store.id] || {};
                            logger.info('[Preference] appliedValue', store.id, store.scope.name, store.appliedValues);
                        } catch (e) {
                            logger.warn('[Preference] Invalid form of preference file: ' + filePath, e);
                        }
                    }
                    resolve();
                });
            });
        }

        function makeStores(scope, extension) {
            return Promise.resolve().then(function () {
                logger.info('[Preference] makeStores', scope, extension);
                if (scope.template) {
                    scope.template(function (templates) {
                        logger.info('[Preference] makeStores:template', templates);
                        return Promise.all(templates.map(function (template) {
                            return fillStoreValues(scope, extension, template);
                        }));
                    });
                } else {
                    return fillStoreValues(scope, extension);
                }
            });
        }

        function traverseScopes(extension) {
            var scopes = extension.scope;
            if (typeof extension.scope === 'string') {
                scopes = [extension.scope];
            }
            return new Promise(function (resolve) {
                // retrieve default values for each extension
                require([extension.module], function (module) {
                    var defaultValues = module[extension.getDefault]();
                    logger.info('[Preference] _getExtensionInfo', extension, defaultValues);
                    extension.defaultValues = defaultValues;
                    resolve();
                });
            }).then(function () {
                // traverse all scopes per extension and make store objects for each scope
                var scopeInfos = _.chain(SCOPE).pick(scopes).values().value();
                logger.info('[Preference] scopeInfos', scopeInfos);
                return Promise.all(scopeInfos.map(function (scope) {
                    return makeStores(scope, extension);
                }));
            });
        }

        var _makeStores = function (extensions) {
            function _getExtensionInfo(ext) {
                return new Promise(function (resolve) {
                    var scopes = ext.scope;
                    if (typeof ext.scope === 'string') {
                        scopes = [ext.scope];
                    }
                    require([ext.module], function (module) {
                        var defaultValues = module[ext.getDefault]();
                        logger.info('[Preference] _getExtensionInfo', ext, defaultValues);
                        resolve({scopes: scopes, defaultValues: defaultValues});
                    });
                });
            }

            function _createStoresPerExt(extension) {
                return _getExtensionInfo(extension).then(function (extInfo) {
                    var scopes = extInfo.scopes;
                    var defaultValues = extInfo.defaultValues;

                    _.chain(SCOPE).pick(scopes).values().sortByOrder(['priority'], ['asc']).forEach(function (scope) {
                        if (scope.template) {
                            var templateValues = scope.template();
                            _.forEach(templateValues, function (value) {
                                var filePath = _.template(scope.root + scope.path)(value);
                                var store = new Store(ext.id, scope.name, filePath);
                                store.defaultValues = defaultValues;
                                self.preferences.push(store);
                            });
                        } else {
                            var filePath = scope.root + scope.path;
                            var store = new Store(ext.id, scope.name, filePath);
                            store.defaultValues = defaultValues;
                            self.preferences.push(store);
                        }
                    }).value();

                    logger.info('[Preference] _createStoresPerExt', self.preferences);
                    return;
                });
            }

            return Promise.all(extensions.map(_createStoresPerExt));
        };

        var _fillAppliedValues = function (preferenceStore) {
            return new Promise(function (resolve, reject) {
                fsCache.readFile(preferenceStore.filePath, function (err, content) {
                    if (err) {
                        logger.warn('Read file error: ' + preferenceStore.filePath, err);
                    } else {
                        try {
                            var prefFromFile = JSON.parse(content);
                            preferenceStore.appliedValues = prefFromFile[preferenceStore.id];
                        } catch (e) {
                            logger.warn('Invalid form of preference file: ' + preferenceStore.filePath, e);
                        }
                    }
                    resolve();
                });
            });
         };

        var _init = function () {

            self.extensions = pluginManager.getExtensions(EXTENSION_NAME);
            logger.log('[Preference] preference extensions: ', self.extensions);

            return self.extensions.map(traverseScopes).then(function() {
                //TODO remove
                logger.log('[Preference] preferences', self.preferences);
            });;

            /*return _makeStores(self.extensions).then(function () {
                return Promise.all(self.preferences.map(_fillAppliedValues));
            }).then(function() {
                //TODO remove
                logger.log('preferences', self.preferences);
            });*/
        };

        _init();
    }

    PreferenceManager.prototype.getStore = function (preferenceId, scope) {
        if(!preferenceId || !scope || SCOPE[scope] === undefined) {
            return null;
        }
        return _.find(this.preferences, {id: preferenceId, scope: scope});
    };

    PreferenceManager.prototype.getStoresByScope = function (scope) {
        if(!scope || SCOPE[scope] === undefined) {
            return null;
        }
        return _.filter(this.preferences, {scope: scope});
    };

    PreferenceManager.prototype.getStoresById = function (preferenceId) {
        if (!preferenceId) {
            return null;
        }
        return _.filter(this.preferences, {id: preferenceId});
    };

    PreferenceManager.prototype.getAllPreferenceTypes = function () {
        return this.extensions;
    };

    PreferenceManager.prototype.flushPreference = function (scope, callback) {
        var flushToFile = {};
        var preferenceByScope = _.find(this.preferences, {scope: scope});
        _.forEach(preferenceByScope, function (pref) {
            flushToFile[pref.id] = pref.getAppliedValues();
        });
        var file = SCOPE[scope].target;
        fsCache.writeFile(file, JSON.stringify(flushToFile), callback);
    };


    if(!_preferenceManager) {
        _preferenceManager = new PreferenceManager();
    }
    return _preferenceManager;
});
