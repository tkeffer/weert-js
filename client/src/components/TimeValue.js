/*
 * Copyright (c) 2017-2018 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 *
 */

// Format and render a time
import React from 'react';
import moment from 'moment/moment';
import PropTypes from 'prop-types';

const propTypes = {
    timestamp: PropTypes.number.isRequired,
    format   : PropTypes.string
};

const defaultProps = {
    componentClass: 'span',
    format        : undefined
};

export default class TimeValue extends React.PureComponent {
    render() {
        const {timestamp, format, componentClass: Component, ...props} = this.props;
        return (<Component {...props}>{moment(timestamp).format(format)}</Component>);
    }
}

TimeValue.propTypes    = propTypes;
TimeValue.defaultProps = defaultProps;
