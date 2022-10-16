/*
 * Copyright (c) 2016-2022 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

import React from "react";
import d3 from "../d3";
import PropTypes from "prop-types";

/**
 * Draw a single "wedge," used to show the direction of the wind. Animate it if the direction changes.
 * @param {number} finalAngle The direction of the wind. 0=N, 90=E, etc.
 * @param {number} initialAngle The previous direction of the wind. Animation starts at this angle.
 * @param {number} radius The inside radius of the wedge in SVG viewBox units
 * @param {number} wedgeLength The size of the wedge in SVG viewBox units
 * @param {number} opacity
 */
class Wedge extends React.Component {
  constructor(props) {
    super(props);
    // Save the initial angle as state. This will be used to animate the wedge should it move.
    this.state = { currentAngle: props.initialAngle };
  }

  componentDidMount() {
    // Once the wedge is mounted, move it into its final position.

    // Get the starting and ending angles
    let startAngle = this.state.currentAngle;
    let endAngle = this.props.finalAngle;

    // To do a transition, both angles must be defined, and not equal to each other.
    // Otherwise, just jump to the ending angle.
    if (startAngle == null || endAngle == null || startAngle === endAngle) {
      this.setState({ currentAngle: endAngle });
    } else {
      // Need to do a transition
      const transitionDuration = this.props.transitionDuration || 1000;
      // Use d3 to calculate a linear transition.
      d3.transition()
        .duration(transitionDuration)
        .ease(d3.easeLinear)
        .tween("attr.transform", () => {
          // Return the transition function. It will take an argument, t, in the domain [0,1].
          // Depending on t, transition to the interpolated angle. D3 will supply values of t that
          // insure the transition will look smooth.
          return (t) => {
            this.setState({ currentAngle: interpolateDegrees(startAngle, endAngle)(t) });
          };
        });
    }
  }

  /* Render the wedge according to the "currentAngle." */
  render() {
    const { radius, wedgeLength, opacity, className } = this.props;
    // Get the angle from state
    const currentAngle = this.state.currentAngle;
    // If the wind direction is undefined, render nothing
    if (currentAngle == null) return null;
    return (
      <path
        d={`M${-wedgeLength} ${-radius - wedgeLength} L0 ${-radius} L${wedgeLength} ${
          -radius - wedgeLength
        } Z`}
        transform={`rotate(${currentAngle})`}
        opacity={opacity}
        className={className}
      />
    );
  }
}

Wedge.propTypes = {
  initialAngle: PropTypes.number,
  finalAngle: PropTypes.number,
  wedgeLength: PropTypes.number,
  transitionDuration: PropTypes.number,
  opacity: PropTypes.number,
  className: PropTypes.string,
};
Wedge.defaultProps = {
  initialAngle: null,
  wedgeLength: 8,
  transitionDuration: 500,
  opacity: 1.0,
  className: "prevDir",
};

/*
 * Represents a dial of previous wind directions.
 */
export default class WedgeWheel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      // The next key to be used:
      nextKey: 0,
      // An array of current and previous directions. Each element of the list is a 2-way list
      // [direction, key].
      windDirs: [],
    };
  }

  // This method gets called after the constructor, but before initial rendering.
  // Use it to set up the list of directions.
  static getDerivedStateFromProps(props, state) {
    // Make a copy. We want windDirs to always be immutable
    let newWindDirs = [...state.windDirs];
    // Push the new direction on to the array of previous directions.
    newWindDirs.push([props.windDirection, state.nextKey]);
    // Trim any stale directions off the front
    newWindDirs.splice(0, newWindDirs.length - props.maxwindDirs);
    // Set windDirs to the "new" windDirs. Update the key.
    return { ...state, nextKey: state.nextKey + 1, windDirs: newWindDirs };
  }

  render() {
    // To cut the clutter, save the length of windDirs
    const N = this.state.windDirs.length;
    return (
      <g transform={`translate(${this.props.centerX}, ${this.props.centerY})`}>
        {this.state.windDirs.map(([angle, key], i) => {
          // This requires a bit of an explanation. The very last element of the
          // array is the current wind direction. We want to ease it into place by starting
          // with the angle of the previous wind direction, which is in the next-to-last
          // position.
          let initialAngle;
          if (N > 1 && i === N - 1) {
            // This is the angle of the previous wind direction
            initialAngle = this.state.windDirs[N - 2][0];
          } else {
            initialAngle = null;
          }
          const klassName = i === N - 1 ? "currentDir" : "prevDir";
          return (
            <Wedge
              initialAngle={initialAngle}
              finalAngle={angle}
              radius={this.props.radius}
              wedgeLength={this.props.wedgeLength}
              className={klassName}
              opacity={(i + 1) / N}
              key={key}
            />
          );
        })}
      </g>
    );
  }
}

WedgeWheel.propTypes = {
  windDirection: PropTypes.number,
  maxwindDirs: PropTypes.number,
  wedgeLength: PropTypes.number,
  centerX: PropTypes.number.isRequired,
  centerY: PropTypes.number.isRequired,
  radius: PropTypes.number.isRequired,
  transitionDuration: PropTypes.number,
};

WedgeWheel.defaultProps = {
  maxwindDirs: 20,
  wedgeLength: 8,
  transitionDuration: 1000,
};

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
    return function (t) {
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
