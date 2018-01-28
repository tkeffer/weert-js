/*
 * Copyright (c) 2017-2018 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 *
 */
import React from 'react';
import PropTypes from 'prop-types';

import PlotGroup from './PlotGroup';

const propTypes = {
    packets          : PropTypes.arrayOf(PropTypes.object).isRequired,
    selectedTimeScale: PropTypes.string.isRequired,
    aggregation      : PropTypes.number,
    PlotProps        : PropTypes.shape({
                                           obstypes      : PropTypes.arrayOf(PropTypes.string),
                                           header        : PropTypes.string,
                                           componentClass: PropTypes.string,
                                       }),

};

export default class TimeGroup extends React.PureComponent {
    render() {
        return (
            <div>
                <p>Place holder for {this.props.selectedTimeScale} stats</p>
                <PlotGroup {...this.props}/>
            </div>
        );
    }
}

TimeGroup.propTypes = propTypes;
