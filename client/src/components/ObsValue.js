/*
 * Copyright (c) 2017-2018 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 *
 */
import React from 'react';
import PropTypes from 'prop-types';
import {sprintf} from 'sprintf-js';

import * as units from '../units';
import TimeValue from './TimeValue';

const propTypes = {
    packet        : PropTypes.object.isRequired,
    obsType       : PropTypes.string.isRequired,
    format        : PropTypes.string,
    componentClass: PropTypes.string,
};

const defaultProps = {
    componentClass: 'span'
};

export default class ObsValue extends React.PureComponent {
    render() {

        const {packet, obsType, componentClass: Component, format} = this.props;

        const val = packet[obsType];

        if (obsType === 'timestamp') {
            return (<TimeValue timestamp={val} componentClass={Component} format={format}/>);
        }

        let str_val;
        if (val === undefined) {
            str_val = "N/A";
        } else {
            const label      = units.getUnitLabel(obsType, packet['unit_system'], val);
            const unitFormat = format || units.getUnitFormat(obsType, packet['unit_system']);
            str_val          = sprintf(unitFormat, val) + label;
        }
        return (<Component>{str_val}</Component>);
    }
}

ObsValue.propTypes    = propTypes;
ObsValue.defaultProps = defaultProps;
