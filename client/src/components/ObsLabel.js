/*
 * Copyright (c) 2017-2018 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 *
 */
import React from 'react';
import PropTypes from 'prop-types';

import * as units from '../units';

const propTypes = {
    obsType       : PropTypes.string.isRequired,
    componentClass: PropTypes.string
};

const defaultProps = {
    componentClass: 'span'
};

export default class ObsLabel extends React.PureComponent {

    componentWillUpdate(nextProp) {
        console.log("In ObsLabel.componentWillUpdate", nextProp);
    }

    render() {
        console.log("In ObsLabel.render");
        // Destructure the props, assigning componentClass to the variable Component...
        const {componentClass: Component, obsType} = this.props;
        // ... then use Component as the element type
        return (<Component>{units.getLabel(obsType)}</Component>);
    }
}

ObsLabel.propTypes    = propTypes;
ObsLabel.defaultProps = defaultProps;