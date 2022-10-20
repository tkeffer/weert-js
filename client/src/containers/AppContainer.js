/*
 * Copyright (c) 2016-2022 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

import union from "lodash/union";
import React from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";

import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import NavDropdown from "react-bootstrap/NavDropdown";
import Navbar from "react-bootstrap/Navbar";
import Row from "react-bootstrap/Row";

import {
  selectTimeSpan,
  selectTimeDetail,
  fetchTimeSpanIfNeeded,
  subscribeMeasurement,
  fetchStatsIfNeeded,
  fetchUptime,
} from "../actions";
import PlotContainer from "./PlotContainer";
import PacketTable from "../components/PacketTable";
import WindCompass from "../components/WindCompass";
import StatsTable from "../components/StatsTable";
import About from "../components/About";
import ServerTable from "../components/ServerTable";

import * as config from "../../config/componentConfig";
import * as api from "../Api";

const propTypes = {
  selectedTags: PropTypes.shape({
    platform: PropTypes.string,
    stream: PropTypes.string,
  }).isRequired,
  selectedTimeSpan: PropTypes.string.isRequired,
  timeSpans: PropTypes.object.isRequired,
  dispatch: PropTypes.func.isRequired,
};

class AppContainer extends React.PureComponent {
  constructor(props, context) {
    super(props, context);
    this.handleChange = this.handleChange.bind(this);
    this.state = {
      subscriptions: {},
      firstRender: true,
      ...config,
    };
  }

  componentDidMount() {
    const { dispatch, selectedTimeSpan } = this.props;
    const { serverUpdate } = this.state.uptimeOptions;
    console.log("serverUpdate=", serverUpdate)

    // We always need 'recent' (for the real-time packet display)
    this.fetchAndSubscribeIfNeeded("recent");
    if (selectedTimeSpan !== "recent") {
      this.fetchAndSubscribeIfNeeded(selectedTimeSpan);
    }

    // Get statistics appropriate for the selected time span. Time span 'recent' always shows
    // the day's statistics.
    const selectedStats = selectedTimeSpan === "recent" ? "day" : selectedTimeSpan;
    dispatch(fetchStatsIfNeeded(selectedStats));

    // Set a timer to regularly fetch new info about the WeeRT server
    function getUptime() {
      dispatch(fetchUptime());
      setTimeout(getUptime, serverUpdate);
    }

    getUptime();
  }

  componentWillUnmount() {
    // Cancel all subscriptions
    for (let subscription of Object.values(this.state.subscriptions)) {
      api.unsubscribe(subscription);
    }
    // Reset the collection of subscriptions.
    this.setState({ ...this.state, subscriptions: {} });
  }

  componentDidUpdate(prevProps) {
    const { selectedTimeSpan } = this.props;
    if (selectedTimeSpan !== prevProps.selectedTimeSpan) {
      this.fetchAndSubscribeIfNeeded(selectedTimeSpan);
      const { dispatch } = this.props;
      const selectedStats = selectedTimeSpan === "recent" ? "day" : selectedTimeSpan;
      dispatch(fetchStatsIfNeeded(selectedStats));
    }
    // No longer the first render
    this.setState({ ...this.state, firstRender: false });
  }

  handleChange(key) {
    if (key.startsWith("recent")) {
      let nextTimeDetail;
      [key, nextTimeDetail] = key.split(".");
      this.props.dispatch(selectTimeDetail(nextTimeDetail));
    }
    this.props.dispatch(selectTimeSpan(key));
  }

  fetchAndSubscribeIfNeeded(timeSpan) {
    const { dispatch, selectedTags } = this.props;
    const timeSpanState = this.props.timeSpans[timeSpan];
    const measurement = timeSpanState.measurement;
    dispatch(fetchTimeSpanIfNeeded(timeSpan, timeSpanState.options));
    // Before subscribing, check to see if we already have a subscription for this series
    if (!this.state.subscriptions[measurement]) {
      // Subscribe to any new packets coming from the given series
      const subscription = dispatch(subscribeMeasurement(measurement, selectedTags));
      // Save the new subscription object. It will be needed to cancel the subscription.
      this.setState({
        ...this.state,
        subscriptions: {
          ...this.state.subscriptions,
          [measurement]: subscription,
        },
      });
    }
  }

  /**
   * Assemble a "current" packet from the array of recent packets
   * @param packets
   */
  getCurrentPacket(packets) {
    const now = Date.now();
    const { staleAge, obsTypes } = this.state.packetTableOptions;
    // Create an array of observation types to include in the final packet. Be
    // sure to include the unit system, as well as wind speed (used by the wind compass).
    let allObsTypes = union(obsTypes, ["unit_system", "wind_speed"]);
    // Wind direction will be included with wind speed
    delete allObsTypes.wind_dir;

    let finalPacket = {};

    // Iterate through the packets, most recent first
    for (let i = packets.length - 1; i >= 0; i--) {
      // If we've already found values for all the required observation types, then break
      if (Object.keys(finalPacket).length >= Object.keys(allObsTypes).length) {
        break;
      }
      const packet = packets[i];
      // If we have worked so far backwards in the array of packets that the packet is too old, break
      if (packet.timestamp == null || packet.timestamp < now - staleAge) {
        break;
      }
      // Replace all non-null values
      for (const obsType of allObsTypes) {
        if (finalPacket[obsType] == null && packet[obsType] != null) {
          finalPacket[obsType] = packet[obsType];
          if (obsType === "wind_speed") {
            finalPacket["wind_dir"] = packet["wind_dir"];
          }
        }
      }
    }
    return finalPacket;
  }

  render() {
    const { selectedTimeSpan } = this.props;
    const selectedState = this.props.timeSpans[selectedTimeSpan];
    const recentState = this.props.timeSpans.recent;

    const currentPacket = this.getCurrentPacket(recentState.packets);
    const isFetchingCurrentPacket = recentState.isFetching;

    const { packetTableOptions, windCompassOptions, statsTableOptions } = this.state;

    let selectedStatsSpan, selectedStats;
    if (selectedTimeSpan === "recent") {
      selectedStatsSpan = "day";
      selectedStats = this.props.stats["day"];
    } else {
      selectedStatsSpan = selectedTimeSpan;
      selectedStats = this.props.stats[selectedTimeSpan];
    }

    const uptimeProps = this.props.uptime;

    return (
      <Container fluid={true}>
        <h2 className="welcome">Welcome to WeeRT</h2>
        <Row>
          <Col xs={4} lg={3}>
            <PacketTable
              {...packetTableOptions}
              packet={currentPacket}
              isFetching={isFetchingCurrentPacket}
            />

            <WindCompass
              {...windCompassOptions}
              windSpeed={currentPacket ? currentPacket["wind_speed"] : undefined}
              windDirection={currentPacket ? currentPacket["wind_dir"] : undefined}
              isFetching={isFetchingCurrentPacket}
            />

            <StatsTable
              {...statsTableOptions[selectedStatsSpan]}
              statsData={selectedStats.data}
              isFetching={selectedStats.isFetching}
            />

            <ServerTable {...uptimeProps} isFetching={uptimeProps.isFetching} />

            <About />

          </Col>

          <Col xs={8} lg={9}>
            <Navbar bg="light" expand="lg">
              <Nav
                bsstyle="tabs"
                activeKey={this.state.selectedTimeSpan}
                onSelect={this.handleChange}
              >
                <NavDropdown title="Recent..." id="recent-dropdown">
                  <NavDropdown.Item eventKey="recent.5">5 minutes</NavDropdown.Item>
                  <NavDropdown.Item eventKey="recent.10">10 minutes</NavDropdown.Item>
                  <NavDropdown.Item eventKey="recent.30">30 minutes</NavDropdown.Item>
                  <NavDropdown.Item eventKey="recent.60">60 minutes</NavDropdown.Item>
                </NavDropdown>
                <Nav.Item>
                  <Nav.Link eventKey="day">Day</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="week">Week</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="month">Month</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="year">Year</Nav.Link>
                </Nav.Item>
              </Nav>
            </Navbar>
            <PlotContainer selectedTimeSpan={selectedTimeSpan} selectedState={selectedState} />
          </Col>
        </Row>
      </Container>
    );
  }
}

AppContainer.propTypes = propTypes;

function mapStateToProps(state) {
  return state;
}

export default connect(mapStateToProps)(AppContainer);
