/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as _ from 'lodash';

import ObsLabel from './ObsLabel';
import ObsValue from './ObsValue';

const propTypes = {
    packet : PropTypes.object.isRequired,
    obsType: PropTypes.string.isRequired
};

export default class ObsRow extends React.PureComponent {
    render() {
        const {packet, obsType} = this.props;
        let value, unitSystem;
        if (!_.isEmpty(packet)) {
            value      = packet[obsType];
            unitSystem = packet['unit_system'];
        }

        return (<tr>
            <ObsLabel componentClass={'td'} obsType={obsType}/>
            <ObsValue componentClass={'td'} obsType={obsType} value={value} unitSystem={unitSystem}/>
        </tr>);
    }
}

ObsRow.propTypes = propTypes;

