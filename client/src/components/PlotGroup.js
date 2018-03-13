/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment/moment';
import {Line} from 'recharts';
import RTPlot from './RTPlot';

import * as units from '../units';

const propTypes = {
    isFetching       : PropTypes.bool.isRequired,
    packets          : PropTypes.arrayOf(PropTypes.object).isRequired,
    obsTypes         : PropTypes.arrayOf(PropTypes.string),
    header           : PropTypes.string,
    xDomain          : PropTypes.array,
    xTicks           : PropTypes.arrayOf(PropTypes.number),
    xTickFormat      : PropTypes.string,
    animationDuration: PropTypes.number,
    dot              : PropTypes.bool,
    width            : PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    height           : PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    margin           : PropTypes.shape({
                                           top   : PropTypes.number,
                                           right : PropTypes.number,
                                           left  : PropTypes.number,
                                           bottom: PropTypes.number,
                                       }),
    stroke           : PropTypes.string,
    strokeWidth      : PropTypes.number,
    debounce         : PropTypes.number,
    componentClass   : PropTypes.string,
};

const defaultProps = {
    obsTypes         : ["wind_speed", "out_temperature", "in_temperature", "radiation_radiation", "sealevel_pressure",],
    header           : "Need a header!",
    xDomain          : ['auto', 'auto'],
    xTickFormat      : 'lll',
    animationDuration: 500,
    dot              : false,
    width            : "95%",
    height           : 200,
    margin           : {top: 5, right: 10, left: 10, bottom: 5},
    stroke           : '#8884d8',
    strokeWidth      : 2,
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
                  obsTypes,
                  header,
                  animationDuration,
                  dot,
                  stroke,
                  strokeWidth,
                  componentClass: Component,
                  ...props,
              } = this.props;


        const timeFormatter = (tick) => {return moment(tick).format(xTickFormat);};

        return (
            <Component>
                {isFetching && !packets.length && <h3>Loading...</h3>}
                {!isFetching && !packets.length && <h3>Empty.</h3>}
                {packets.length &&
                 <div style={{opacity: isFetching ? 0.5 : 1}}>

                     <h3>{header}</h3>

                     {obsTypes.map((obsType, i) => {
                         return (
                             <div key={obsType}>
                                 <h4>{units.getLabel(obsType)}</h4>
                                 <RTPlot {...props} packets={packets}>
                                     <Line type='linear'
                                           dataKey={obsType}
                                           stroke={stroke}
                                           dot={dot}
                                           isAnimationActive={false}
                                           animationDuration={animationDuration}
                                           animationEasing='linear'
                                           strokeWidth={strokeWidth}
                                     />
                                 </RTPlot>
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
