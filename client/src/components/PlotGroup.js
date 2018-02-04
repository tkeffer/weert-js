/*
 * Copyright (c) 2017-2018 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 *
 */
// Render and format a packet
import React from 'react';
import PropTypes from 'prop-types';
import {LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend} from 'recharts';
import d3 from './d3';

const propTypes = {
    selectedTimeScale: PropTypes.string.isRequired,
    packets          : PropTypes.arrayOf(PropTypes.object).isRequired,
    obsTypes         : PropTypes.arrayOf(PropTypes.string),
    aggregation      : PropTypes.number,
    isFetching       : PropTypes.bool,
    componentClass   : PropTypes.string,
};

const defaultProps = {
    obsTypes      : ["wind_speed", "sealevel_pressure", "out_temperature", "in_temperature"],
    isFetching    : false,
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
        const {
                  selectedTimeScale, packets, obsTypes,
                  aggregation, isFetching, componentClass: Component
              } = this.props;
        const timeFormatter = (tick) => {return d3.timeFormat('%H:%M:%S')(new Date(tick))};

        // TODO: Need buttons to change detail
        return (
            <Component>
                {isFetching && !packets && <h3>Loading...</h3>}
                {!isFetching && !packets && <h3>Empty.</h3>}
                {packets &&
                 <div style={{opacity: isFetching ? 0.5 : 1}}>

                     <h3>{selectedTimeScale} plots </h3>
                     {aggregation && <h4>({aggregation} minute aggregation)</h4>}

                     <h4> Selected detail: {this.state.selectedDetail}</h4>
                     {/* Include a key. See https://reactjs.org/docs/reconciliation.html#keys */}
                     {obsTypes.map((obsType, i) => {
                         return (
                             <LineChart width={600} height={300} data={packets}
                                        margin={{top: 5, right: 30, left: 20, bottom: 5}} key={obsType}>
                                 <XAxis dataKey="timestamp" scale="time" tickFormatter={timeFormatter}/>
                                 <YAxis/>
                                 <CartesianGrid strokeDasharray='3 3' />
                                 <Tooltip labelFormatter={timeFormatter}/>
                                 <Legend/>
                                 <Line type="monotone" dataKey={obsType} stroke="#8884d8" activeDot={{r: 8}}/>
                             </LineChart>
                         );
                     })}
                 </div>}
            </Component>
        );
    }
}

PlotGroup.propTypes    = propTypes;
PlotGroup.defaultProps = defaultProps;
