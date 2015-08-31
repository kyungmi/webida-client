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
 * @since: 15. 8. 19
 * @author: Koong Kyungmi (kyungmi.k@samsung.com)
 */

define([
    'external/lodash/lodash.min'
], function (
    _
) {
    'use strict';

    function PreferenceStore(id, scope, filePath) {
        this.id = id;
        this.scope = scope;
        this.filePath = filePath;

        this.dirty = false;
        this.valid = true;
        this.override = false;

        this.defaultValues = {};
        this.appliedValues = {};
        this.currentValues = _.clone(this.appliedValues, true);

        this.valueChangeListener = [];
        this.stateChangeListener = [];
    }

    PreferenceStore.prototype.get = function (key) {
        if (this.override && this.currentValues[key]) {
            return this.currentValues[key];
        } else {
            return this.defaultValues[key];
        }
    };

    PreferenceStore.prototype.set = function (key, value) {
        if (value !== undefined && this.currentValues[key] !== value) {
            this.currentValues[key] = value;
            this.setDirty(true);
        }
    };

    PreferenceStore.prototype.getAll = function () {
        if (this.override) {
            return _.extend({}, this.defaultValues, this.currentValues);
        } else {
            return this.defaultValues;
        }
    };

    PreferenceStore.prototype.setAll = function (all) {
        this.currentValues = all || {};
        this.setDirty(true);
    };

    PreferenceStore.prototype.getAppliedValues = function () {
        return this.appliedValues;
    };

    PreferenceStore.prototype.getDirty = function () {
        return this.dirty;
    };

    PreferenceStore.prototype.setDirty = function (dirty) {
        this.dirty = dirty;

    };

    PreferenceStore.prototype.getValid = function () {
        return this.valid;
    };

    PreferenceStore.prototype.setValid = function (valid) {
        this.valid = valid;
    };

    PreferenceStore.prototype.restore = function () {
        this.setAll();
    };

    PreferenceStore.prototype.addValueChangeListener = function (listener) {
        if (this.valueChangeListener.indexOf(listener) === -1) {
            this.valueChangeListener.push(listener);
        }
    };

    PreferenceStore.prototype.removeValueChangeListener = function (listener) {
        this.valueChangeListener = _.remove(this.valueChangeListener, listener);
    };

    PreferenceStore.prototype.addStateChangeListener = function (listener) {
        if (this.valueChangeListener.indexOf(listener) === -1) {
            this.valueChangeListener.push(listener);
        }
    };

    PreferenceStore.prototype.removeStateChangeListener = function (listener) {
        this.valueChangeListener = _.remove(this.valueChangeListener, listener);
    };

    PreferenceStore.prototype.setOverride = function (override) {
        this.override = override;
    };

    return PreferenceStore;
});
