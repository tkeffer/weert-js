/*
 * Copyright (c) 2017-2018 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 *
 */
import React from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import Grid from 'react-bootstrap/lib/Grid';
import Row from 'react-bootstrap/lib/Row';
import Col from 'react-bootstrap/lib/Col';
import Jumbotron from 'react-bootstrap/lib/Jumbotron';

import {
    selectTags, selectTimeSpan, selectNewStartTime,
    selectTimeDetail, startNewTimeSpan, fetchRecentIfNeeded, fetchTimeSpanIfNeeded,
    subscribeMeasurement
} from '../actions';
import PacketTable from '../components/PacketTable';
import WindCompass from '../components/WindCompass';
import StatsTable from '../components/StatsTable';
import PlotGroup from '../components/PlotGroup';
import Picker from '../components/Picker';

const propTypes = {
    selectedTags    : PropTypes.shape({
                                          platform: PropTypes.string,
                                          stream  : PropTypes.string
                                      }).isRequired,
    selectedTimeSpan: PropTypes.oneOfType([PropTypes.string,
                                              PropTypes.number]).isRequired,
    recent          : PropTypes.shape({
                                          isFetching        : PropTypes.boolean,
                                          measurement       : PropTypes.string,
                                          maxAge            : PropTypes.number,
                                          selectedTimeDetail: PropTypes.oneOfType([PropTypes.string,
                                                                                      PropTypes.number]),
                                          packets           : PropTypes.array
                                      }).isRequired,
    timeSpans       : PropTypes.object.isRequired,
    dispatch        : PropTypes.func.isRequired
};

const initialPlotGroupState = {
    recent: {
        tickFormat: "LTS"
    },
    day   : {
        tickFormat: "LTS"
    },
    week  : {
        tickFormat: "L"
    },
    month : {
        tickFormat: "L"
    },
    year  : {
        tickFormat: "L"
    }
};

class AppContainer extends React.PureComponent {
    constructor(props) {
        super(props);
        this.handleChange = this.handleChange.bind(this);
        this.state        = {
            subscriptions : {},
            plotGroupState: initialPlotGroupState,
        };
    }

    componentDidMount() {
        const {selectedTimeSpan} = this.props;
        // We always need 'recent' (for the real-time packet display)
        this.fetchAndSubscribeIfNeeded('recent');
        if (selectedTimeSpan !== 'recent')
            this.fetchAndSubscribeIfNeeded(selectedTimeSpan);
    }

    componentWillUnmount() {
        // Cancel all subscriptions
        for (let subscription of Object.values(this.state.subscriptions)) {
            subscription.cancel();
        }
        // Reset the collection of subscriptions.
        this.setState({...this.state, subscriptions: {}});
    }

    componentDidUpdate(prevProps) {
        if (this.props.selectedTimeSpan !== prevProps.selectedTimeSpan) {
            this.fetchAndSubscribeIfNeeded(this.props.selectedTimeSpan);
        }
    }

    handleChange(nextTimeScale) {
        this.props.dispatch(selectTimeSpan(nextTimeScale));
    }

    fetchAndSubscribeIfNeeded(timeSpan) {
        let measurement;
        const {dispatch, selectedTags} = this.props;
        if (timeSpan === 'recent') {
            measurement = this.props.recent.measurement;
            dispatch(fetchRecentIfNeeded(this.props.recent.maxAge));
        } else {
            const timeSpanState = this.props.timeSpans[timeSpan];
            measurement         = timeSpanState.measurement;
            dispatch(fetchTimeSpanIfNeeded(timeSpan, timeSpanState.start, timeSpanState.aggregation));
        }
        // Before subscribing, check to see if we already have a subscription for this series
        if (!this.state.subscriptions[measurement]) {
            // Subscribe to any new packets coming from the given series
            const subscription = dispatch(subscribeMeasurement(measurement, selectedTags));
            // Save the new subscription object. It will be needed to cancel the subscription.
            this.setState({...this.state, subscriptions: {...this.state.subscriptions, [measurement]: subscription}});
        }
    }

    renderPlotGroup() {
        const {selectedTimeSpan} = this.props;
        const {plotGroupState}   = this.state;
        let selectedState, header, packets;
        if (selectedTimeSpan === 'recent') {
            let firstGood;
            header        = `Last ${this.props.recent.selectedTimeDetail} minutes`;
            selectedState = this.props.recent;
            if (selectedState.packets.length) {
                const trimTime    = Date.now() - selectedState.selectedTimeDetail * 60000;
                const firstRecent = selectedState.packets.findIndex((packet) => {
                    return packet.timestamp >= trimTime;
                });

                // If there was no good packet, skip them all. Otherwise, just
                // up to the first good packet
                firstGood = firstRecent === -1 ? selectedState.packets.length : firstRecent;
            } else {
                firstGood = 0;
            }
            packets = selectedState.packets.slice(firstGood);
        } else {
            selectedState = this.props.timeSpans[selectedTimeSpan];
            packets = selectedState.packets;
            header        = `This ${selectedTimeSpan}`;
            if (selectedState.aggregation) {
                header += ` (${selectedState.aggregation / 60000} minute aggregation)`;
            }
        }
        return (
            <PlotGroup {...plotGroupState[selectedTimeSpan]}
                       isFetching={selectedState.isFetching}
                       packets={packets}
                       header={header}
            />
        );
    }

    render() {
        const currentPacket           = this.props.recent.packets[this.props.recent.packets.length - 1];
        const isFetchingCurrentPacket = this.props.recent.isFetching;

        const {
                  selectedTimeSpan,
              } = this.props;
        const {
                  packetTableState,
                  windCompassState,
                  statsTableState,
              } = this.state;
        let selectedStats;
        if (selectedTimeSpan === 'recent') {
            selectedStats = this.props.timeSpans['day'];
        } else {
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
                            <Picker
                                value={selectedTimeSpan}
                                onChange={this.handleChange}
                                options={['recent', 'day', 'week', 'month', 'year']}
                            />
                        </div>

                        <div>
                            <PacketTable {...packetTableState}
                                         packet={currentPacket}
                                         isFetching={isFetchingCurrentPacket}
                            />
                        </div>

                        <div>
                            <WindCompass {...windCompassState}
                                         windSpeed={currentPacket ? currentPacket['wind_speed'] : undefined}
                                         windDirection={currentPacket ? currentPacket['wind_dir'] : undefined}
                                         isFetching={isFetchingCurrentPacket}
                            />
                        </div>

                        <div>
                            <StatsTable {...statsTableState}
                                        stats={selectedStats}
                                        isFetching={selectedStats.isFetching}
                            />
                        </div>
                    </Col>

                    <Col xs={12} lg={9}>
                        {this.renderPlotGroup()}
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