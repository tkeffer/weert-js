/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */
import React from "react";
import PropTypes from "prop-types";
const humanizeDuration = require("humanize-duration");

// React component that represents a row in the "About server" table.
function DataRow(props) {
  const { label, value, isFetching } = props;
  return (
    <tr>
      <td>{label}</td>
      <td style={{ fontWeight: "bold", paddingLeft: "10px" }}>
        {isFetching && "Loading"}
        {!isFetching && <span>{value}</span>}
      </td>
    </tr>
  );
}

const propTypes = {
  node_version: PropTypes.string.isRequired,
  server_uptime: PropTypes.number,
  weert_uptime: PropTypes.number,
  weert_version: PropTypes.string.isRequired,
  isFetching: PropTypes.bool
};

const defaultProps = {
  server_uptime: undefined,
  weert_uptime: undefined,
  isFetching: false
};

export default class About extends React.PureComponent {
  render() {
    const { server_uptime, weert_uptime, node_version, weert_version, isFetching } = this.props;
    // Get nice, human readable strings from the raw uptime value
    const server_uptime_str = humanizeDuration(parseInt(server_uptime, 10) * 1000.0);
    const weert_uptime_str = humanizeDuration(parseInt(weert_uptime, 10) * 1000.0);

    return (
      <div>
        <h2>About</h2>
        <div
          style={{
            borderStyle: "solid",
            borderWidth: "1px",
            borderColor: "#ddd"
          }}
        >
          <h4>Server</h4>
          <ul>
            <li>
              The server runs on <a href="https://nodejs.org">Node</a> and uses the{" "}
              <a href="http://expressjs.com">Express framework</a>;
            </li>
            <li>It receives packet updates from WeeWX via a RESTful interface;</li>
            <li>
              The packets are then stored in an <a href="https://www.influxdata.com">InfluxDB</a>{" "}
              server.
            </li>
          </ul>
          <h4>Client</h4>
          <ul>
            <li>
              The client uses <a href="https://reactjs.org/">React</a> for rendering and{" "}
              <a href="https://redux.js.org/">Redux</a> for state management;
            </li>
            <li>The client requests data using the WeeRT server's RESTful interface;</li>
            <li>
              Real time updates are done through a publish - subscribe interface using{" "}
              <a href="https://socket.io/">Socket.io;</a>
            </li>
            <li>
              Real time plots are done using the plotting library{" "}
              <a href="http://recharts.org">Recharts</a>.
            </li>
          </ul>
          <h4>Code</h4>
          <ul>
            <li>
              Source code and README can be found in the
              <a href="https://github.com/tkeffer/weert-js"> GitHub repository</a>
            </li>
          </ul>
          <h4>Server information</h4>
          <div style={{ opacity: isFetching ? 0.5 : 1 }}>
            <table style={{ marginLeft: "30px" }}>
              <tbody>
                <DataRow label="Node version" value={node_version} isFetching={isFetching} />
                <DataRow label="Server uptime" value={server_uptime_str} isFetching={isFetching} />
                <DataRow label="WeeRT uptime" value={weert_uptime_str} isFetching={isFetching} />
                <DataRow label="WeeRT version" value={weert_version} isFetching={isFetching} />
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }
}

About.propTypes = propTypes;
About.defaultProps = defaultProps;
