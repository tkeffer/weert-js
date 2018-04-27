/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

import React from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import Grid from "react-bootstrap/lib/Grid";
import Row from "react-bootstrap/lib/Row";
import Col from "react-bootstrap/lib/Col";
import Jumbotron from "react-bootstrap/lib/Jumbotron";
import Tabs from "react-bootstrap/lib/Tabs";
import Nav from "react-bootstrap/lib/Nav";
import NavDropdown from "react-bootstrap/lib/NavDropdown";
import NavItem from "react-bootstrap/lib/NavItem";
import MenuItem from "react-bootstrap/lib/MenuItem";

import {
  selectTimeSpan,
  selectTimeDetail,
  fetchTimeSpanIfNeeded,
  subscribeMeasurement,
  fetchStatsIfNeeded
} from "../actions";
import PlotContainer from "./PlotContainer";
import PacketTable from "../components/PacketTable";
import WindCompass from "../components/WindCompass";
import StatsTable from "../components/StatsTable";
import About from "../components/About";
import * as config from "../../config/componentConfig";
import * as api from "../Api";

const propTypes = {
  selectedTags: PropTypes.shape({
    platform: PropTypes.string,
    stream: PropTypes.string
  }).isRequired,
  selectedTimeSpan: PropTypes.string.isRequired,
  timeSpans: PropTypes.object.isRequired,
  dispatch: PropTypes.func.isRequired
};

class AppContainer extends React.PureComponent {
  constructor(props, context) {
    super(props, context);
    this.handleChange = this.handleChange.bind(this);
    this.state = {
      subscriptions: {},
      ...config
    };
  }

  componentDidMount() {
    const { dispatch, selectedTimeSpan } = this.props;

    // We always need 'recent' (for the real-time packet display)
    this.fetchAndSubscribeIfNeeded("recent");
    if (selectedTimeSpan !== "recent") {
      this.fetchAndSubscribeIfNeeded(selectedTimeSpan);
    }

    // Get statistics appropriate for the selected time span. Time span 'recent' always shows
    // the day's statistics.
    const selectedStats = selectedTimeSpan === "recent" ? "day" : selectedTimeSpan;
    dispatch(fetchStatsIfNeeded(selectedStats));
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
          [measurement]: subscription
        }
      });
    }
  }

  render() {
    const { selectedTimeSpan } = this.props;
    const selectedState = this.props.timeSpans[selectedTimeSpan];
    const recentState = this.props.timeSpans.recent;

    const currentPacket = recentState.packets.slice(-1)[0];
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

    return (
      <Grid fluid={true}>
        <Jumbotron>
          <h2>Welcome to WeeRT</h2>
        </Jumbotron>
        <Row>
          <Col xs={12} lg={3}>
            <div>
              <PacketTable
                {...packetTableOptions}
                packet={currentPacket}
                isFetching={isFetchingCurrentPacket}
              />
            </div>

            <div>
              <WindCompass
                {...windCompassOptions}
                windSpeed={currentPacket ? currentPacket["wind_speed"] : undefined}
                windDirection={currentPacket ? currentPacket["wind_dir"] : undefined}
                isFetching={isFetchingCurrentPacket}
              />
            </div>

            <div>
              <StatsTable
                {...statsTableOptions[selectedStatsSpan]}
                statsData={selectedStats.data}
                isFetching={selectedStats.isFetching}
              />
            </div>
            <div>
              <About />
            </div>
          </Col>

          <Col xs={12} lg={9}>
            <Nav
              bsStyle="tabs"
              activeKey={this.state.selectedTimeSpan}
              onSelect={this.handleChange}
            >
              <NavDropdown eventKey="recent" title="Recent..." id="recent-dropdown">
                <MenuItem eventKey="recent.5">5 minutes</MenuItem>
                <MenuItem eventKey="recent.10">10 minutes</MenuItem>
                <MenuItem eventKey="recent.30">30 minutes</MenuItem>
                <MenuItem eventKey="recent.60">60 minutes</MenuItem>
              </NavDropdown>
              <NavItem eventKey="day">Day</NavItem>
              <NavItem eventKey="week">Week</NavItem>
              <NavItem eventKey="month">Month</NavItem>
              <NavItem eventKey="year">Year</NavItem>
            </Nav>
            <PlotContainer selectedTimeSpan={selectedTimeSpan} selectedState={selectedState} />
          </Col>
        </Row>
      </Grid>
    );
  }
}

AppContainer.propTypes = propTypes;

function mapStateToProps(state) {
  return state;
}

export default connect(mapStateToProps)(AppContainer);
