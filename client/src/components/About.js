/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */
import React from "react";
const humanizeDuration = require('humanize-duration')

export default class About extends React.PureComponent {
  render() {
    const { server_uptime, weert_uptime, node_version, weert_version, isFetching } = this.props;
    const server_uptime_str = humanizeDuration(parseInt(server_uptime, 10) * 1000.0);
    const weert_uptime_str = humanizeDuration(parseInt(weert_uptime, 10) * 1000.0);
    const labelStyle = {
    };

    const dataStyle = {
      "font-weight": "bold",
      "padding-left": "10px",
    };

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
          <table style={{"margin-left": "30px"}}>
            <tr>
              <td style={labelStyle}>Node version</td>
              <td style={dataStyle}>{node_version}</td>
            </tr>
            <tr>
              <td style={labelStyle}>Server uptime</td>
              <td style={dataStyle}>{server_uptime_str}</td>
            </tr>
            <tr>
              <td style={labelStyle}>WeeRT uptime</td>
              <td style={dataStyle}>{weert_uptime_str}</td>
            </tr>
            <tr>
              <td style={labelStyle}>WeeRT version</td>
              <td style={dataStyle}>{weert_version}</td>
            </tr>
          </table>
        </div>
      </div>
    );
  }
}
