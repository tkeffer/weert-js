/*
 * Copyright (c) 2016-2022 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

// Render and format a packet
import React from "react";
import PropTypes from "prop-types";
import Table from "react-bootstrap/Table";

import ObsRow from "./ObsRow";

const propTypes = {
  packet: PropTypes.object,
  obsTypes: PropTypes.arrayOf(PropTypes.string),
  header: PropTypes.string,
  isFetching: PropTypes.bool,
};

const defaultProps = {
  packet: undefined,
  obsTypes: [
    "timestamp",
    "wind_speed",
    "out_temperature",
    "in_temperature",
    "radiation_radiation",
    "sealevel_pressure",
  ],
  header: "Current values",
  isFetching: true,
};

function PacketTable(props) {
  const { obsTypes, header, isFetching, packet } = props;
  return (
    <div>
      <div className="widget_title">{header}</div>
      {
        <div style={{ opacity: isFetching ? 0.5 : 1 }}>
          <Table bordered hover>
            <tbody>
              {/* Include a key. See https://reactjs.org/docs/reconciliation.html#keys */}
              {obsTypes.map((obsType) => (
                <ObsRow obsType={obsType} packet={packet} key={obsType} isFetching={isFetching} />
              ))}
            </tbody>
          </Table>
        </div>
      }
    </div>
  );
}

PacketTable.propTypes = propTypes;
PacketTable.defaultProps = defaultProps;

export default PacketTable;
