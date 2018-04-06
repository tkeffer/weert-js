/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */
import React from "react";
export default class About extends React.PureComponent {
  render() {
    // ... then use Component as the element type
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
              The server runs on <a href="https://nodejs.org">Node</a> and uses
              the <a href="http://expressjs.com">Express framework</a>;
            </li>
            <li>
              It receives packet updates from WeeWX via a RESTful interface;
            </li>
            <li>
              The packets are then stored in an{" "}
              <a href="https://www.influxdata.com">InfluxDB</a> server.
            </li>
          </ul>
          <h4>Client</h4>
          <ul>
            <li>
              The client uses <a href="https://reactjs.org/">React</a> for
              rendering and <a href="https://redux.js.org/">Redux</a> for state
              management;
            </li>
            <li>
              The client requests data using the WeeRT server's RESTful
              interface;
            </li>
            <li>
              Real time updates are done through a publish - subscribe interface
              using <a href="http://faye.jcoglan.com">Faye;</a>
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
              <a href="https://github.com/tkeffer/weert-js">
                {" "}
                GitHub repository
              </a>
            </li>
          </ul>
        </div>
      </div>
    );
  }
}
