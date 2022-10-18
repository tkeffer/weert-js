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
function DataRow(props) {
  const { label, value, isFetching } = props;
  return (
    <tr>
      <td className="label">{label}</td>
      <td className="fadeIn data" key={value} style={{ fontWeight: "bold", paddingLeft: "10px" }}>
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
  isFetching: PropTypes.bool,
};

const defaultProps = {
  server_uptime: undefined,
  weert_uptime: undefined,
  isFetching: false,
};

export default class ServerTable extends React.PureComponent {
  render() {
    const { server_uptime, weert_uptime, node_version, weert_version, isFetching } = this.props;
    // Get nice, human-readable strings from the raw uptime value
    const server_uptime_str = humanizeDuration(parseInt(server_uptime, 10) * 1000.0);
    const weert_uptime_str = humanizeDuration(parseInt(weert_uptime, 10) * 1000.0);

    return (
      <div>
        <div className="widget_title">Server information</div>
        {
          <div style={{ opacity: isFetching ? 0.5 : 1 }}>
            <Table bordered hover>
              <tbody>
                <DataRow
                  label="Node version"
                  value={node_version}
                  isFetching={isFetching}
                />
                <DataRow
                  label="Server uptime"
                  value={server_uptime_str}
                  isFetching={isFetching}
                />
                <DataRow
                  label="WeeRT uptime"
                  value={weert_uptime_str}
                  isFetching={isFetching}
                />
                <DataRow
                  label="WeeRT version"
                  value={weert_version}
                  isFetching={isFetching}
                />
              </tbody>
            </Table>
          </div>
        }
      </div>
    );
  }
}

ServerTable.propTypes = propTypes;
ServerTable.defaultProps = defaultProps;
