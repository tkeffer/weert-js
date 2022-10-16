/*
 * Copyright (c) 2016-2022 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

/*
 * A re-implementation of Peter Finley's D3 "WindCompass" using React.
 */

import React from "react";
import PropTypes from "prop-types";
import classnames from "classnames";

import "./index.css";
import WedgeWheel from "./wedgewheel";

/*
 * WindCompass PropTypes:
 */
const propTypes = {
  windSpeed: PropTypes.number,
  windDirection: PropTypes.number,
  padding: PropTypes.number,
  tickLength: PropTypes.number,
  ticksPerQuad: PropTypes.number,
  decimalDigits: PropTypes.number,
  naText: PropTypes.string,
  windSpeedUnitLabel: PropTypes.string,
  ordinalText: PropTypes.arrayOf(PropTypes.string),
  viewBoxSize: PropTypes.number,
};

const defaultProps = {
  padding: 20,
  tickLength: 10,
  ticksPerQuad: 8,
  decimalDigits: 0,
  naText: "N/A",
  windSpeedUnitLabel: "mph",
  ordinalText: [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ],
  viewBoxSize: 250,
};

/**
 * Draw a single tick mark
 * @param {number} angle The angle at which to draw the mark. 0=N, 90=E, etc.
 * @param {number} radius The outside radius of the marks in SVG viewBox units
 * @param {number} tickLength The length of the tick mark in SVG viewBox units
 * @constructor
 */
const Tick = ({ angle, radius, tickLength }) => {
  // This assumes that the origin is in the center of the circle of ticks. Y increases downwards.
  return (
    <path
      className={classnames("tick", { tick45: angle % 45 === 0 }, { tick90: angle % 90 === 0 })}
      d={`M0  ${-radius} L0 ${-radius + tickLength}`}
      transform={`rotate(${angle})`}
    />
  );
};

export default class WindCompass extends React.PureComponent {
  constructor(props) {
    super(props);
  }

  generateTicks(centerX, centerY, radius) {
    const tickAngles = generateTickPositions(this.props.ticksPerQuad);

    return (
      <g transform={`translate(${centerX}, ${centerY})`}>
        {tickAngles.map((angle) => (
          <Tick angle={angle} radius={radius} tickLength={this.props.tickLength} key={angle} />
        ))}
      </g>
    );
  }

  generateSpeedDisplay() {
    let text;
    if (this.props.windSpeed == null) {
      text = this.props.naText;
    } else {
      text = this.props.windSpeed.toFixed(this.props.decimalDigits);
    }
    return (
      <text className="speedDisplay" dx="50%" dy="50%">
        <tspan className="speedReadout">{text}</tspan>
        <tspan className="speedSuffix">{this.props.windSpeedUnitLabel}</tspan>
      </text>
    );
  }

  generateOrdinalDisplay() {
    let text;
    if (this.props.windDirection == null) {
      text = this.props.naText;
    } else {
      text = this.windDirToCardinalConverter(this.props.windDirection);
    }
    return (
      <text className="ordinalDisplay" dx="50%" dy="65%">
        {text}
      </text>
    );
  }

  generateIsFetching() {
    return (
      <text className="ordinalDisplay" dx="50%" dy="60%" style={{ opacity: 0.5 }}>
        Loading
      </text>
    );
  }

  windDirToCardinalConverter(dir) {
    let ordinal = Math.round(dir / 22.5);
    if (ordinal === 16) ordinal = 0;
    return this.props.ordinalText[ordinal];
  }

  render() {
    const { viewBoxSize, isFetching } = this.props;
    const centerX = viewBoxSize / 2;
    const centerY = viewBoxSize / 2;
    const radius = viewBoxSize / 2 - this.props.padding;

    return (
      <div className="WindCompass">
        <svg viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} preserveAspectRatio="xMidYMid meet">
          {this.generateTicks(centerX, centerY, radius)}
          {isFetching && this.generateIsFetching()}
          {!isFetching && this.generateSpeedDisplay()}
          {!isFetching && this.generateOrdinalDisplay()}
          <WedgeWheel
            windDirection={this.props.windDirection}
            centerX={centerX}
            centerY={centerY}
            radius={radius}
          />
        </svg>
      </div>
    );
  }
}

WindCompass.propTypes = propTypes;
WindCompass.defaultProps = defaultProps;

function generateTickPositions(ticksPerQuad) {
  let angles = [];
  const tickInterval = 360 / 4 / ticksPerQuad;
  for (let q = 0; q < 360; q += tickInterval) {
    angles.push(q);
  }
  return angles;
}
