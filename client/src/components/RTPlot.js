/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

import React from "react";
import PropTypes from "prop-types";
import moment from "moment/moment";
import isString from "lodash/isString";
import { sprintf } from "sprintf-js";
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

import * as utility from "../utility";
import * as units from "../units";

const propTypes = {
  packets: PropTypes.arrayOf(PropTypes.object).isRequired,
  xDomain: PropTypes.array,
  xTicks: PropTypes.arrayOf(PropTypes.number),
  plotLines: PropTypes.arrayOf(PropTypes.object),
  componentClass: PropTypes.string
};

const defaultProps = {
  xDomain: ["auto", "auto"],
  componentClass: "div"
};

export default class RTPlot extends React.PureComponent {
  getUnitLabel() {
    const { packets, plotLines } = this.props;
    const obsType = plotLines && plotLines[0] ? plotLines[0].obsType : null;
    const unitSystem = packets.length ? packets[0].unit_system : null;
    return units.getUnitLabel(obsType, unitSystem);
  }

  getYTickFormatter() {
    let { yTickFormat } = this.props;
    if (yTickFormat == null)
      return undefined;
    const { packets, plotLines } = this.props;
    if (!isString(yTickFormat)) {
      const obsType = plotLines && plotLines[0] ? plotLines[0].obsType : null;
      const unitSystem = packets.length ? packets[0].unit_system : null;
      yTickFormat = units.getUnitFormat(obsType, unitSystem);
    }
    return tick => sprintf(yTickFormat, tick);
  }

  renderLabels(props) {
    return (
      <h4 style={{ textAlign: "center" }}>
        <span style={{ float: "left" }}>{this.getUnitLabel()}</span>
        <span>
          {props.plotLines.map((plotLine, i) => {
            const options = {
              ...utility.getOptions(props),
              ...plotLine
            };
            return (
              <span key={i} style={{ color: options.stroke }}>
                {(plotLine.obsLabel || units.getLabel(plotLine.obsType)) + " "}
              </span>
            );
          })}
        </span>
      </h4>
    );
  }

  render() {
    const {
      packets,
      xDomain,
      xTicks,
      componentClass: Component,
      ...props
    } = this.props;

    const timeFormatter = tick => {
      return moment(tick).format(props.xTickFormat);
    };

    return (
      <div>
        {this.renderLabels(props)}
        <ResponsiveContainer
          width={props.width}
          height={props.height}
          debounce={props.debounce}
        >
          <LineChart data={packets} margin={props.margin}>
            <XAxis
              dataKey="timestamp"
              domain={xDomain}
              scale="time"
              type="number"
              ticks={xTicks}
              tickFormatter={timeFormatter}
            />
            <YAxis
              domain={["auto", "auto"]}
              unit={props.yUnit}
              interval={props.yInterval}
              tickFormatter={this.getYTickFormatter()}
            />
            <CartesianGrid strokeDasharray="3 3" />
            <Tooltip labelFormatter={timeFormatter} />
            {props.plotLines.map((plotLine, i) => {
              const options = {
                ...utility.getOptions(props),
                ...plotLine
              };
              return (
                <Line
                  key={i}
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
      </div>
    );
  }
}

RTPlot.propTypes = propTypes;
RTPlot.defaultProps = defaultProps;
