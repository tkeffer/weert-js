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
    timestamp     : PropTypes.number.isRequired,
    format        : PropTypes.string,
    componentClass: PropTypes.string
};

const defaultProps = {
    format        : undefined,
    componentClass: 'span',
};

export default class TimeValue extends React.PureComponent {
    render() {
        const {timestamp, format, componentClass: Component} = this.props;
        return (<Component>{moment(timestamp).format(format)}</Component>);
    }
}

TimeValue.propTypes    = propTypes;
TimeValue.defaultProps = defaultProps;
