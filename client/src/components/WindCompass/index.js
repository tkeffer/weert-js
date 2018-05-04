/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

/*
 * A re-implementation of Peter Finley's D3 "WindCompass" using React.
 */

import React from "react";
import PropTypes from "prop-types";
import classnames from "classnames";

// D3 is used, but only for transitions. All DOM manipulations are done through React.
import d3 from "../d3";

import "./index.css";

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
  maxPrevDirs: PropTypes.number,
  wedgeLength: PropTypes.number,
  viewBoxSize: PropTypes.number
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
    "NNW"
  ],
  maxPrevDirs: 20,
  wedgeLength: 5,
  viewBoxSize: 250
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

/**
 * Draw a single "wedge," used to show the direction of the wind. Animate it if the direction changes.
 * @param {number} angle The direction of the wind. 0=N, 90=E, etc.
 * @param {number} radius The inside radius of the wedge in SVG viewBox units
 * @param {number} wedgeLength The size of the wedge in SVG viewBox units
 */
class Wedge extends React.PureComponent {
  constructor(props) {
    super(props);
    // Save the initial angle as state. This will be used to animate the wedge should it move.
    this.state = { angle: props.angle };
  }

  componentWillReceiveProps(nextProps) {
    // Get the starting and ending angles
    let startAngle = this.props.angle;
    let endAngle = nextProps.angle;

    // To do a transition, both angles must be defined, and not equal to each other.
    // Otherwise, just jump to the ending angle.
    if (startAngle == null || endAngle == null || startAngle === endAngle) {
      this.setState({ angle: endAngle });
    } else {
      // Need to do a transition
      const transitionDuration = this.props.transitionDuration || 1000;
      // Use d3 to calculate a linear transition.
      // TODO: Should we be using react-transition-group instead??
      d3
        .transition()
        .duration(transitionDuration)
        .ease(d3.easeLinear)
        .tween("attr.transform", () => {
          // Return the transition function. It will take an argument, t, in the domain [0,1].
          // Depending on t, transition to the interpolated angle. D3 will supply values of t that
          // insure the transition will look smooth.
          return t => {
            this.setState({ angle: interpolateDegrees(startAngle, endAngle)(t) });
          };
        });
    }
  }

  render() {
    const { radius, wedgeLength, ...rest } = this.props;
    // Get the angle from state
    const { angle } = this.state;
    // If the wind direction is undefined, render nothing
    if (angle == null) return null;
    return (
      <path
        d={`M${-wedgeLength} ${-radius - wedgeLength} L0 ${-radius} L${wedgeLength} ${-radius -
          wedgeLength} Z`}
        transform={`rotate(${angle})`}
        {...rest}
      />
    );
  }
}

export default class WindCompass extends React.PureComponent {
  constructor(props) {
    super(props);
    // This will hold the previous wind directions, as well as a unique key for each direction.
    this.state = { key: 0, prevDirs: [] };
  }

  componentWillReceiveProps() {
    // Make a copy. We want prevDirs to always be immutable
    let newPrevDirs = [...this.state.prevDirs];
    // Push the direction on to the array of previous directions.
    newPrevDirs.push([this.props.windDirection, this.state.key]);
    // Trim any stale directions off the front
    newPrevDirs.splice(0, newPrevDirs.length - this.props.maxPrevDirs);
    // Set prevDirs to the "new" prevDirs. Update the key.
    this.setState({ ...this.state, key: this.state.key + 1, prevDirs: newPrevDirs });
  }

  generateTicks(centerX, centerY, radius) {
    const tickAngles = generateTickPositions(this.props.ticksPerQuad);

    return (
      <g transform={`translate(${centerX}, ${centerY})`}>
        {tickAngles.map(angle => (
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

  generateDirections(centerX, centerY, radius) {
    // Generate the previous directions first, then the current direction,
    // so the latter will be on the top.
    return (
      <g transform={`translate(${centerX}, ${centerY})`}>
        {/* First the previous directions */}
        {this.state.prevDirs.map(([angle, key], i) => (
          <Wedge
            angle={angle}
            radius={radius}
            wedgeLength={this.props.wedgeLength}
            className="prevDir"
            opacity={(i + 1) / this.state.prevDirs.length}
            key={key}
          />
        ))}
        {/* Then the current direction */}
        <Wedge
          angle={this.props.windDirection}
          radius={radius}
          wedgeLength={this.props.wedgeLength}
          className="currDir"
        />
      </g>
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
          {this.generateDirections(centerX, centerY, radius)}
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

// This will return a function that interpolates between a and b.
function interpolateDegrees(a, b) {
  if (a == null) a = 0;
  if (b == null) b = 0;

  // Normalize a and b to the domain [0, 360).
  a = a % 360.0;
  if (a < 0) a += 360.0;
  b = b % 360.0;
  if (b < 0) b += 360.0;

  // Detect which is the shortest way around. Should we go around the North side?
  if (Math.abs(b - a) > 180) {
    return function(t) {
      let ax, bx, shift;
      if (a > b) {
        shift = 360 - a;
        ax = 0;
        bx = b + shift;
      } else {
        shift = 360 - b;
        bx = 0;
        ax = a + shift;
      }
      let v = d3.interpolateNumber(ax, bx)(t) - shift;
      if (v < 0) v += 360;
      return v;
    };
  }
  return d3.interpolateNumber(a, b);
}
