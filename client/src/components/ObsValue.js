/*
 * Copyright (c) 2017-2018 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 *
 */
import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import {sprintf} from 'sprintf-js';
import moment from 'moment/moment';

import * as units from '../units';

const propTypes = {
    packet        : PropTypes.object.isRequired,
    obsType       : PropTypes.string.isRequired,
    format        : PropTypes.string,
    componentClass: PropTypes.string,
};

const defaultProps = {
    format        : undefined,
    componentClass: 'div'
};

export default class ObsValue extends React.PureComponent {

    constructor(props) {
        super(props);
        this.state = {oldString: "", key: true};
    }

    componentWillReceiveProps(newProps) {
        // Check to see whether the new props will change the resultant HTML. If it does,
        // toggle "key".
        const newString = getString(newProps.obsType, newProps.packet, newProps.format);
        const oldString = ReactDOM.findDOMNode(this).innerHTML;
        const key       = oldString === newString ? this.state.key : !this.state.key;
        this.setState({oldString, key});
    }

    render() {

        const {packet, obsType, componentClass: Component, format} = this.props;

        const newString = getString(this.props.obsType, this.props.packet, format);

        // Apply a "fade in" if the resultant string has changed.
        const cn = this.state.oldString === newString ? "" : "fadeIn";

        // Include the toggled key. This will cause React to think the component is a new component, thus
        // forcing a new animation and the fade in.
        return (<Component key={this.state.key} className={cn}>{newString}</Component>);
    }
}

ObsValue.propTypes    = propTypes;
ObsValue.defaultProps = defaultProps;

function getString(obsType, packet, format) {
    const val = packet[obsType];
    if (val === undefined) {
        return "N/A";
    }

    // Special treatment for time
    if (obsType === 'timestamp') {
        return moment(val).format(format);
    }

    // It's a regular ol' observation type. Get a label and format the number.
    const label      = units.getUnitLabel(obsType, packet['unit_system'], val);
    const unitFormat = format || units.getUnitFormat(obsType, packet['unit_system']);
    return sprintf(unitFormat, val) + label;
}