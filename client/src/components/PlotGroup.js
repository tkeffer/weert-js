/*
 * Copyright (c) 2017-2018 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 *
 */
// Render and format a packet
import React from 'react';
import PropTypes from 'prop-types';

const propTypes = {
    packets          : PropTypes.arrayOf(PropTypes.object).isRequired,
    obsTypes         : PropTypes.arrayOf(PropTypes.string),
    selectedTimeScale: PropTypes.string.isRequired,
    aggregation      : PropTypes.number,
    componentClass   : PropTypes.string,
};

const defaultProps = {
    obsTypes      : ["wind_speed", "sealevel_pressure", "out_temperature", "in_temperature"],
    componentClass: 'div',
};

export default class PlotGroup extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state        = {selectedDetail: 5};
        this.handleChange = this.handleChange.bind(this);
    }

    handleChange(nextSelectedDetail) {
        this.setState({selectedDetail: nextSelectedDetail});
    }

    render() {
        const {componentClass: Component, obsTypes, header, aggregation, selectedTimeScale, packets} = this.props;
        // TODO: Need buttons to change detail
        return (
            <Component>
                <h3>{selectedTimeScale} plots </h3>
                {aggregation && <h4>({aggregation} minute aggregation)</h4>}

                <h4> Selected detail: {this.state.selectedDetail}</h4>
                {/* Include a key. See https://reactjs.org/docs/reconciliation.html#keys */}
                {obsTypes.map((obsType, i) => {
                    return (<p key={i}>Place holder for a plot of {obsType} </p>);
                })}
            </Component>
        );
    }
}

PlotGroup.propTypes    = propTypes;
PlotGroup.defaultProps = defaultProps;
