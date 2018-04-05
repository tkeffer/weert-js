/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

import React from "react";
import PropTypes from "prop-types";

import RTPlot from "./RTPlot";
import * as utility from "../utility";

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

    const options = utility.getOptions(plotGroupOptions);

    return (
      <Component>
        {isFetching && !packets.length && <h3>Loading...</h3>}
        {!isFetching && !packets.length && <h3>Empty.</h3>}
        {packets.length && (
          <div style={{ opacity: isFetching ? 0.5 : 1 }}>
            <h2>{header}</h2>

            {plotGroupOptions.plots &&
              plotGroupOptions.plots.map((plot, i) => {
                const plotOptions = {
                  xDomain,
                  xTicks,
                  ...options,
                  ...plot
                };

                return <RTPlot key={i} {...plotOptions} packets={packets} />;
              })}
          </div>
        )}
      </Component>
    );
  }
}

PlotGroup.propTypes = propTypes;
PlotGroup.defaultProps = defaultProps;
