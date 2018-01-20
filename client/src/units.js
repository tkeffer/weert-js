/*
 * Copyright (c) 2017-2018 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 *
 */
import * as unitConfig from '../config/unitConfig';

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
