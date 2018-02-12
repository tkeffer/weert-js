/*
 * Copyright (c) 2017-2018 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 *
 */
// Render and format a packet
import React from 'react';
import PropTypes from 'prop-types';
import {LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer} from 'recharts';
import d3 from './d3';

const propTypes = {
    isFetching       : PropTypes.bool.isRequired,
    packets          : PropTypes.arrayOf(PropTypes.object).isRequired,
    header           : PropTypes.string,
    obsTypes         : PropTypes.arrayOf(PropTypes.string),
    animationDuration: PropTypes.number,
    dot              : PropTypes.bool,
    width            : PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    height           : PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    margin           : PropTypes.shape({
                                           top   : PropTypes.number,
                                           right : PropTypes.number,
                                           left  : PropTypes.number,
                                           bottom: PropTypes.number
                                       }),
    stroke           : PropTypes.string,
    debounce         : PropTypes.number,
    componentClass   : PropTypes.string,
};

const defaultProps = {
    header           : "Need a header!",
    obsTypes         : ["wind_speed", "sealevel_pressure", "out_temperature", "in_temperature"],
    animationDuration: 500,
    dot              : false,
    width            : "95%",
    height           : 200,
    margin           : {top: 5, right: 10, left: 10, bottom: 5},
    stroke           : '#8884d8',
    debounce         : 200,
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
                  isFetching,
                  packets,
                  header,
                  obsTypes,
                  animationDuration,
                  dot,
                  width,
                  height,
                  margin,
                  stroke,
                  debounce,
                  componentClass: Component
              }             = this.props;
        const timeFormatter = (tick) => {return d3.timeFormat('%H:%M:%S')(new Date(tick));};

        // TODO: Need tabs to change detail
        return (
            <Component>
                {isFetching && !packets && <h3>Loading...</h3>}
                {!isFetching && !packets && <h3>Empty.</h3>}
                {packets &&
                 <div style={{opacity: isFetching ? 0.5 : 1}}>

                     <h3>{header}</h3>

                     {obsTypes.map((obsType, i) => {
                         return (
                             <div key={obsType}>
                                 <h4>{obsType} of length {packets.length}</h4>
                                 <ResponsiveContainer width={width} height={height} debounce={debounce}>
                                     <LineChart
                                         data={packets}
                                         margin={margin}>
                                         <XAxis
                                             dataKey='timestamp'
                                             domain={['auto', 'auto']}
                                             scale='time'
                                             type='number'
                                             tickFormatter={timeFormatter}
                                         />
                                         <YAxis/>
                                         <CartesianGrid
                                             strokeDasharray='3 3'
                                         />
                                         <Tooltip
                                             labelFormatter={timeFormatter}
                                         />
                                         <Line type='linear'
                                               dataKey={obsType}
                                               stroke={stroke}
                                               dot={dot}
                                               animationDuration={animationDuration}
                                               animationEasing='linear'
                                         />
                                     </LineChart>
                                 </ResponsiveContainer>
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
