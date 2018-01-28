/*
 * Copyright (c) 2017-2018 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 *
 */

import React from 'react';
import PropTypes from 'prop-types';

import ObsLabel from './ObsLabel';
import ObsValue from './ObsValue';

const propTypes = {
    packet : PropTypes.object.isRequired,
    obsType: PropTypes.string.isRequired
};

export default class ObsRow extends React.PureComponent {
    render() {
        return (<tr>
            <ObsLabel componentClass={'td'} obsType={this.props.obsType}/>
            <ObsValue componentClass={'td'} obsType={this.props.obsType} packet={this.props.packet}/>
        </tr>);
    }
}

ObsRow.propTypes = propTypes;

