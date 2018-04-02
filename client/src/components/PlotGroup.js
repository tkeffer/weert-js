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

                        {plotGroupOptions.plots &&
                            plotGroupOptions.plots.map((plot, i) => {
                                const plotOptions = {
                                    xDomain,
                                    xTicks,
                                    ...options,
                                    ...plot
                                };

                                return (
                                    <RTPlot
                                        key={i}
                                        {...plotOptions}
                                        packets={packets}
                                    />
                                );
                            })}
                    </div>
                )}
            </Component>
        );
    }
}

PlotGroup.propTypes = propTypes;
PlotGroup.defaultProps = defaultProps;
