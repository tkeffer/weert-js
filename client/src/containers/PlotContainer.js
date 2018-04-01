/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

import React from "react";
import PropTypes from "prop-types";
import moment from "moment/moment";

import d3 from "../components/d3";
import { findFirstGood, getOptions } from "../utility";
import * as config from "../../config/componentConfig";
import PlotGroup from "../components/PlotGroup";

const propTypes = {
    selectedTimeSpan: PropTypes.string.isRequired,
    selectedState: PropTypes.object.isRequired
};

export default class PlotContainer extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            plotOptions: config.plotOptions
        };
    }

    render() {
        let packets, header, tMin, tMax, xDomain, xTicks;

        const options = getOptions(this.state.plotOptions);

        const { selectedTimeSpan, selectedState } = this.props;

        // First, get the packets we will plot, as well as their min and max timestamp. Oh, and also a header.
        if (selectedTimeSpan === "recent") {
            const firstGood = findFirstGood(
                selectedState.packets,
                selectedState.options.selectedTimeDetail * 60000
            );
            packets = selectedState.packets.slice(firstGood);
            if (packets.length) {
                tMin = packets[0].timestamp;
                tMax = packets[packets.length - 1].timestamp;
            }

            header = `Last ${selectedState.options.selectedTimeDetail} minutes`;
        } else {
            packets = selectedState.packets;
            tMin = moment(selectedState.options.start).startOf(
                selectedTimeSpan
            );
            tMax = moment(selectedState.options.start).endOf(selectedTimeSpan);

            header = `This ${selectedTimeSpan}`;
            if (selectedState.options.aggregation) {
                header += ` (${selectedState.options.aggregation} aggregation)`;
            }
        }

        // Now, given tMin and tMax, calculate a nice domain.
        if (!packets.length) {
            xDomain = ["auto", "auto"];
            xTicks = [];
        } else {
            // Use d3 to pick a nice domain function.
            const domainFn = d3
                .scaleTime()
                .domain([new Date(tMin), new Date(tMax)])
                .nice(options.nXTicks);
            // Use the function to pick sensible tick marks
            xTicks = domainFn
                .ticks(options.nXTicks)
                .map(t => new Date(t).getTime());
            // And get the domain array from the function. This will be as two strings, each holding a time
            const domainStr = domainFn.domain();
            // Convert the strings to numbers, which is what react-charts expect
            xDomain = [
                new Date(domainStr[0]).getTime(),
                new Date(domainStr[1]).getTime()
            ];
        }

        const plotGroupOptions = {
            ...options,
            ...this.state.plotOptions.plotGroups[selectedTimeSpan]
        };
        return (
            <PlotGroup
                plotGroupOptions={plotGroupOptions}
                isFetching={selectedState.isFetching}
                packets={packets}
                header={header}
                xDomain={xDomain}
                xTicks={xTicks}
            />
        );
    }
}

PlotContainer.propTypes = propTypes;
