/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';

import * as units from '../units';

const propTypes = {
    obsType       : PropTypes.string.isRequired,
    value         : PropTypes.number.isRequired,
    unitSystem    : PropTypes.number,
    format        : PropTypes.string,
    componentClass: PropTypes.string,
};

const defaultProps = {
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
        const newString = units.getValueString(newProps.obsType,
                                               newProps.value,
                                               newProps.unitSystem,
                                               newProps.format);
        const oldString = ReactDOM.findDOMNode(this).innerHTML;
        const key       = oldString === newString ? this.state.key : !this.state.key;
        this.setState({oldString, key});
    }

    render() {

        const {obsType, value, unitSystem, format, componentClass: Component} = this.props;

        const newString = units.getValueString(obsType,
                                               value,
                                               unitSystem,
                                               format);

        // Apply a "fade in" if the resultant string has changed.
        const cn = this.state.oldString === newString ? "" : "fadeIn";

        // Include the toggled key. This will cause React to think the component is a new component, thus
        // forcing a new animation and the fade in.
        return (<Component key={this.state.key} className={cn}>{newString}</Component>);
    }
}

ObsValue.propTypes    = propTypes;
ObsValue.defaultProps = defaultProps;
