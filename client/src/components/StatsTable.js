/*
 * Copyright (c) 2017-2018 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 *
 */

import React from 'react';
import PropTypes from 'prop-types';

const propTypes = {
    stats         : PropTypes.object,
    isFetching    : PropTypes.bool,
    componentClass: PropTypes.string
};

const defaultProps = {
    stats         : undefined,
    isFetching    : false,
    componentClass: 'div'
};

/*
 * Place holder for a table holding statistics
 */
export default class StatsTable extends React.PureComponent {
    render() {
        const {componentClass: Component, stats, isFetching} = this.props;
        return (
            <Component>
                <p></p>
                {isFetching && !stats && <h3>Loading...</h3>}
                {!isFetching && !stats && <h3>Empty stats place holder</h3>}
                {stats && <h3>Place holder for a table of statistics.</h3>}
            </Component>
        );
    }
}

StatsTable.propTypes    = propTypes;
StatsTable.defaultProps = defaultProps;
