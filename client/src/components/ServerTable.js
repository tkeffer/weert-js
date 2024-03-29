/*
 * Copyright (c) 2016-2022 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */
import React from "react";
import PropTypes from "prop-types";
import Table from "react-bootstrap/Table";
import humanizeDuration from "humanize-duration";

// React component that represents a row in the "Server Information" table.
function DataRow (props) {
  const { label, value, isFetching } = props;
  const value_str                    = isFetching ? "Loading" : value;
  return (
    <tr>
      <td className='label' style={{ width: "30%" }}>
        {label}
      </td>
      <td className='data' style={{ fontWeight: "bold", paddingLeft: "10px", width: "70%" }}>
        <span key={value_str} className='fadeIn'>
          {value_str}
        </span>
      </td>
    </tr>
  );
}

/* Show uptime information about the WeeRT server */
function ServerTable (props) {

  const { server_uptime, weert_uptime, node_version, weert_version, isFetching } = props;

  // Get nice, human-readable strings from the raw uptime value
  const server_uptime_str = humanizeDuration(parseInt(server_uptime, 10) * 1000.0);
  const weert_uptime_str = humanizeDuration(parseInt(weert_uptime, 10) * 1000.0);

  return (
    <div>
      <div className='widget_title'>Server information</div>
      {
        <div style={{ opacity: isFetching ? 0.5 : 1 }}>
          <Table bordered hover>
            <tbody>
            <DataRow
              label='Server uptime'
              value={server_uptime_str}
              key={"server_uptime"}
              isFetching={isFetching}
            />
            <DataRow
              label='WeeRT uptime'
              value={weert_uptime_str}
              key={"weert_uptime"}
              isFetching={isFetching}
            />
            <DataRow
              label='WeeRT version'
              value={weert_version}
              key={"weert_version"}
              isFetching={isFetching}
            />
            <DataRow
              label='Node version'
              value={node_version}
              key={"node_version"}
              isFetching={isFetching}
            />
            </tbody>
          </Table>
        </div>
      }
    </div>
  );
}

ServerTable.propTypes = {
  server_uptime: PropTypes.number,
  weert_uptime: PropTypes.number,
  isFetching: PropTypes.bool,
};

ServerTable.defaultProps = {
  server_uptime: undefined,
  weert_uptime: undefined,
  isFetching: false
};

export default ServerTable;
