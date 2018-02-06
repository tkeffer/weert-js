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
    animationDuration: PropTypes.number,
    dot              : PropTypes.bool,
    margin           : PropTypes.shape({
                                           top   : PropTypes.number,
                                           right : PropTypes.number,
                                           left  : PropTypes.number,
                                           bottom: PropTypes.number
                                       }),
    stroke           : PropTypes.string,
    componentClass   : PropTypes.string,
};

const defaultProps = {
    obsTypes         : ["wind_speed", "sealevel_pressure", "out_temperature", "in_temperature"],
    isFetching       : false,
    animationDuration: 500,
    dot              : false,
    margin           : {top: 5, right: 30, left: 20, bottom: 5},
    stroke           : '#8884d8',
    componentClass   : 'div',
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
                  selectedTimeScale,
                  packets,
                  obsTypes,
                  aggregation,
                  isFetching,
                  animationDuration,
                  dot,
                  margin,
                  stroke,
                  componentClass: Component
              }             = this.props;
        const timeFormatter = (tick) => {return d3.timeFormat('%H:%M:%S')(new Date(tick));};

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
                     {obsTypes.map((obsType, i) => {
                         return (
                             <div key={obsType}>
                                 <h4>{obsType} of length {packets.length}</h4>
                                 <LineChart width={600} height={300} data={packets}
                                            margin={margin}>
                                     <XAxis dataKey='timestamp' scale='time' tickFormatter={timeFormatter}/>
                                     <YAxis/>
                                     <CartesianGrid strokeDasharray='3 3'/>
                                     <Tooltip labelFormatter={timeFormatter}/>
                                     <Line type='linear'
                                           dataKey={obsType}
                                           stroke={stroke}
                                           animationDuration={animationDuration}
                                           dot={dot}
                                           animationEasing='linear'/>
                                 </LineChart>
                             </div>
                         );
                     })}
                 </div>}
            </Component>
        );
    }
}

PlotGroup.propTypes    = propTypes;
PlotGroup.defaultProps = defaultProps;
