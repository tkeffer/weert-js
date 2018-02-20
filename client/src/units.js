/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

import * as unitConfig from '../config/unitConfig';
import {sprintf} from 'sprintf-js';
import moment from 'moment/moment';

const groupMap = {
    0x01: unitConfig.unitSystem_US,
    0x10: unitConfig.unitSystem_Metric,
    0x11: unitConfig.unitSystem_MetricWX
};

export function getLabel(obsType) {
    if (obsType in unitConfig.obsLabels) {
        return unitConfig.obsLabels[obsType] || obsType;
    } else {
        return obsType;
    }
}

export function getUnitGroup(obsType) {
    const last = obsType.split('_')
                        .slice(-1)[0];
    return `group_${last}`;
}

export function getUnit(unitGroup, unitSystem) {
    const system = groupMap[unitSystem];
    const unit   = system ? system[unitGroup] : undefined;
    return unit;
}

export function getUnitFormat(obsType, unitSystem) {
    const unitGroup = getUnitGroup(obsType);
    const unit      = getUnit(unitGroup, unitSystem);
    // If the unit system is unknown, or can't be found in the unitFormats object, return a generic format
    return unitConfig.unitFormats[unit] || "%s";
}


export function getUnitLabel(obsType, unitSystem, val) {
    const unitGroup = getUnitGroup(obsType);
    const unit      = getUnit(unitGroup, unitSystem);
    const unitLabel = unitConfig.unitLabels[unit];
    // No label if we don't recognize the unit
    if (unitLabel === undefined) return "";
    // Check if this is a unit that has a singular / plural form
    if (Array.isArray(unitLabel)) {
        if (val === 1)
            return unitLabel[0];
        else
            return unitLabel[1];
    }
    return unitLabel;
}

/**
 * Format an observation value
 * @param {string} obsType - The observation type (e.g., "out_temperature")
 * @param {number} val - Its numeric value
 * @param {number} unitSystem - The unit system it's in.
 * @param {string} [format] - A formatting string. If not provided, an appropriate one will be chosen.
 * @returns {string}
 */
export function getValueString(obsType, val, unitSystem, format) {
    if (val === undefined) {
        return "N/A";
    }

    // Special treatment for time
    if (obsType === 'timestamp') {
        return moment(val).format(format);
    }

    // It's a regular ol' observation type. Get a label and format the number.
    const label      = getUnitLabel(obsType, unitSystem, val);
    const unitFormat = format || getUnitFormat(obsType, unitSystem);
    return sprintf(unitFormat, val) + label;
}


