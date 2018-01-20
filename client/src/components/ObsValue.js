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
    packet : PropTypes.object.isRequired,
    obsType: PropTypes.string.isRequired
};

const defaultProps = {
    componentClass: 'span'
};

export default class ObsValue extends React.Component {
    render() {

        const {packet, obsType, ...props} = this.props;

        const val = packet[obsType];

        if (obsType === 'timestamp') {
            return (<TimeValue timestamp={val} {...props}/>);
        }

        const {componentClass: Component, ...newprops} = props;

        let str_val;
        if (val === undefined) {
            str_val = "N/A";
        } else {
            const format = units.getUnitFormat(obsType, packet['unit_system']);
            const label  = units.getUnitLabel(obsType, packet['unit_system'], val);
            str_val      = sprintf(format, val) + label;
        }
        return (<Component {...newprops}>{str_val}</Component>);
    }
}

ObsValue.propTypes    = propTypes;
ObsValue.defaultProps = defaultProps;
