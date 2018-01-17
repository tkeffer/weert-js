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
        return unitConfig.obsLabels[obsType];
    } else {
        return obsType;
    }
}

export function getUnitGroup(obsType) {
    const last = obsType.split('_')
                        .slice(-1)[0];
    return `group_{last}`;
}

export function getUnit(unitGroup, unitSystem) {
    // TODO: Need some error handling
    const system = groupMap[unitSystem];
    const unit   = system[unitGroup];
    return unit;
}

export function getFormat(unit) {
}


export function getUnitLabel(obsType, unitSystem) {
    const unitGroup = getUnitGroup(obsType);
    const unit      = getUnit(unitGroup, unitSystem);
    const unitLabel = unitConfig.unitLabels[unit];
    return unitLabel;
}
