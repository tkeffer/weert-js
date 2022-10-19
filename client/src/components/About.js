/*
 * Copyright (c) 2016-2022 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */
import React from "react";

export default function About() {
  return (
    <div>

      <div className="widget_title">
        About
      </div>

      <div
        style={{
          borderStyle: "solid",
          borderWidth: "1px",
          borderColor: "#ddd",
          padding: "10px",
          "font-size": "80%"
        }}
      >

        <p>
          The server runs on <a href="https://nodejs.org">Node</a> and uses the <a href="http://expressjs.com">Express
          framework</a>. It receives packet updates from WeeWX via a RESTful interface, then stores them in an <a
          href="https://www.influxdata.com">InfluxDB</a> server.
        </p>

        <p>
          The client uses <a href="https://reactjs.org/">React</a> for rendering and <a
          href="https://redux.js.org/">Redux</a> for state management. The client requests data using the WeeRT server's
          RESTful interface. Real time updates are done through a publish - subscribe interface using <a
          href="https://socket.io/">Socket.io</a>. Real time plots are done using the plotting library <a
          href="http://recharts.org">Recharts</a>.
        </p>

        <p>
          Source code and README can be found in the<a href="https://github.com/tkeffer/weert-js"> GitHub repository</a>
        </p>

      </div>
    </div>
  );
}
