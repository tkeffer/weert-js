/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

import React from "react";
import PropTypes from "prop-types";
import moment from "moment/moment";

import RTPlot from "./RTPlot";
import { getOptions } from "../utility";
import * as units from "../units";

const propTypes = {
    plotGroupOptions: PropTypes.object.isRequired,
    isFetching: PropTypes.bool.isRequired,
    packets: PropTypes.arrayOf(PropTypes.object).isRequired,
    header: PropTypes.string,
    xDomain: PropTypes.array,
    xTicks: PropTypes.arrayOf(PropTypes.number).isRequired,
    componentClass: PropTypes.string
};

const defaultProps = {
    header: "Need a header!",
    xDomain: ["auto", "auto"],
    componentClass: "div"
};

export default class PlotGroup extends React.PureComponent {
    constructor(props) {
        super(props);
    }
    render() {
        const {
            plotGroupOptions,
            isFetching,
            packets,
            header,
            xDomain,
            xTicks,
            componentClass: Component
        } = this.props;

        // const timeFormatter = tick => {
        //     return moment(tick).format(xTickFormat);
        // };

        const options = getOptions(plotGroupOptions);

        return (
            <Component>
                {isFetching && !packets.length && <h3>Loading...</h3>}
                {!isFetching && !packets.length && <h3>Empty.</h3>}
                {packets.length && (
                    <div style={{ opacity: isFetching ? 0.5 : 1 }}>
                        <h3>{header}</h3>

                        {plotGroupOptions.plots.map(plot => {
                            const plotOptions = {
                                ...options,
                                ...plot
                            };
                            // return (<p>options={JSON.stringify(plotOptions, null, 2)}</p>)
                            return (
                                <RTPlot {...plotOptions} packets={packets} />
                            );
                        })}

                        {/*<h4>*/}
                        {/*{units.getLabel("out_temperature")} /{" "}*/}
                        {/*{units.getLabel("dewpoint_temperature")}*/}
                        {/*</h4>*/}
                        {/*<RTPlot {...props} packets={packets}>*/}
                        {/*<Line*/}
                        {/*dataKey={"out_temperature"}*/}
                        {/*type={options.type}*/}
                        {/*stroke={options.stroke}*/}
                        {/*dot={options.dot}*/}
                        {/*isAnimationActive={options.false}*/}
                        {/*animationDuration={options.animationDuration}*/}
                        {/*animationEasing={options.animationEasing}*/}
                        {/*strokeWidth={options.strokeWidth}*/}
                        {/*/>*/}
                        {/*<Line*/}
                        {/*dataKey={"dewpoint_temperature"}*/}
                        {/*type={options.type}*/}
                        {/*stroke={options.stroke}*/}
                        {/*dot={options.dot}*/}
                        {/*isAnimationActive={options.false}*/}
                        {/*animationDuration={options.animationDuration}*/}
                        {/*animationEasing={options.animationEasing}*/}
                        {/*strokeWidth={options.strokeWidth}*/}
                        {/*/>*/}
                        {/*</RTPlot>*/}
                    </div>
                )}
            </Component>
        );
    }
}

PlotGroup.propTypes = propTypes;
PlotGroup.defaultProps = defaultProps;
