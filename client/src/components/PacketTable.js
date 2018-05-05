/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

// Render and format a packet
import React from "react";
import PropTypes from "prop-types";
import isEmpty from "lodash/isEmpty";
import Table from "react-bootstrap/lib/Table";

import ObsRow from "./ObsRow";

const propTypes = {
  packet: PropTypes.object,
  obsTypes: PropTypes.arrayOf(PropTypes.string),
  header: PropTypes.string,
  isFetching: PropTypes.bool,
  componentClass: PropTypes.string
};

const defaultProps = {
  packet: undefined,
  obsTypes: [
    "timestamp",
    "wind_speed",
    "out_temperature",
    "in_temperature",
    "radiation_radiation",
    "sealevel_pressure"
  ],
  header: "Current values",
  isFetching: true,
  componentClass: "div"
};

export default class PacketTable extends React.PureComponent {
  render() {
    const { componentClass: Component, obsTypes, header, isFetching, packet } = this.props;
    return (
      <Component>
        <h2>{header}</h2>
        {
          <div style={{ opacity: isFetching ? 0.5 : 1 }}>
            <Table bordered hover>
              <tbody>
                {/* Include a key. See https://reactjs.org/docs/reconciliation.html#keys */}
                {obsTypes.map(obsType => (
                  <ObsRow obsType={obsType} packet={packet} key={obsType} isFetching={isFetching} />
                ))}
              </tbody>
            </Table>
          </div>
        }
      </Component>
    );
  }
}

PacketTable.propTypes = propTypes;
PacketTable.defaultProps = defaultProps;
