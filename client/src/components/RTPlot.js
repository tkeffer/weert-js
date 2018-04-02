/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

import React from "react";
import PropTypes from "prop-types";
import moment from "moment/moment";
import {
    Line,
    LineChart,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from "recharts";

import { getOptions } from "../utility";

const propTypes = {
    packets: PropTypes.arrayOf(PropTypes.object).isRequired,
    xDomain: PropTypes.array,
    xTicks: PropTypes.arrayOf(PropTypes.number),
    xTickFormat: PropTypes.string,
    width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    margin: PropTypes.shape({
        top: PropTypes.number,
        right: PropTypes.number,
        left: PropTypes.number,
        bottom: PropTypes.number
    }),
    debounce: PropTypes.number,
    plotLines: PropTypes.arrayOf(PropTypes.object),
    componentClass: PropTypes.string
};

const defaultProps = {
    xDomain: ["auto", "auto"],
    xTickFormat: "lll",
    width: "95%",
    height: 200,
    margin: { top: 5, right: 10, left: 10, bottom: 5 },
    debounce: 200,
    componentClass: "div"
};

export default class RTPlot extends React.PureComponent {
    render() {
        const {
            packets,
            xDomain,
            xTicks,
            xTickFormat,
            width,
            height,
            margin,
            debounce,
            componentClass: Component,
            ...props
        } = this.props;

        const timeFormatter = tick => {
            return moment(tick).format(xTickFormat);
        };
        console.log("props=", props);

        return (
            <ResponsiveContainer
                width={width}
                height={height}
                debounce={debounce}
            >
                <LineChart data={packets} margin={margin}>
                    <XAxis
                        dataKey="timestamp"
                        domain={xDomain}
                        scale="time"
                        type="number"
                        ticks={xTicks}
                        tickFormatter={timeFormatter}
                    />
                    <YAxis domain={["auto", "auto"]} />
                    <CartesianGrid strokeDasharray="3 3" />
                    <Tooltip labelFormatter={timeFormatter} />
                    {props.plotLines.map(plotLine => {
                        const options = {
                            ...getOptions(props),
                            ...plotLine
                        };
                        return (
                            <Line
                                key={options.obsType}
                                type={options.type}
                                dataKey={options.obsType}
                                stroke={options.stroke}
                                dot={options.dot}
                                isAnimationActive={options.isAnimationActive}
                                animationDuration={options.animationDuration}
                                animationEasing={options.animationEasing}
                                strokeWidth={options.strokeWidth}
                            />
                        );
                    })}
                </LineChart>
            </ResponsiveContainer>
        );
    }
}

RTPlot.propTypes = propTypes;
RTPlot.defaultProps = defaultProps;
