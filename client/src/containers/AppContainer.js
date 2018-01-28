/*
 * Copyright (c) 2017-2018 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 *
 */
import React from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';

import {selectTimeScale, fetchMeasurementIfNeeded, subscribeMeasurement} from '../actions';
import PacketGroup from '../components/PacketGroup';
import TimeGroup from '../components/TimeGroup';
import Picker from '../components/Picker';

const propTypes = {
    selectedTimeScale: PropTypes.string.isRequired,
    dispatch         : PropTypes.func.isRequired
};

class AppContainer extends React.PureComponent {
    constructor(props) {
        super(props);
        this.handleChange = this.handleChange.bind(this);
        this.state        = {subscriptions: {}};
    }

    componentDidMount() {
        const {selectedTimeScale} = this.props;
        // We always need the most recent packets:
        this.fetchAndSubscribeIfNeeded('day');
        // We may also need wxrecords:
        if (selectedTimeScale !== 'day') {
            this.fetchAndSubscribeIfNeeded(selectedTimeScale);
        }
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
        if (this.props.selectedTimeScale !== prevProps.selectedTimeScale) {
            this.fetchAndSubscribeIfNeeded(this.props.selectedTimeScale);
        }
    }

    handleChange(nextTimeScale) {
        this.props.dispatch(selectTimeScale(nextTimeScale));
        this.fetchAndSubscribeIfNeeded(nextTimeScale);
    }

    fetchAndSubscribeIfNeeded(timeScale) {
        const measurement      = timeScale === 'day' ? 'wxpackets' : 'wxrecords';
        const {dispatch, selectedTags} = this.props;
        dispatch(fetchMeasurementIfNeeded(measurement));
        // Before subscribing, check to see if we already have a subscription for this series
        if (!this.state.subscriptions[measurement]) {
            // Subscribe to any new packets coming from the given series
            const subscription = dispatch(subscribeMeasurement(measurement, selectedTags));
            // Save the new subscription object. It will be needed to cancel the subscription.
            this.setState({...this.state, subscriptions: {...this.state.subscriptions, [measurement]: subscription}});
        }
    }

    render() {
        const {selectedTimeScale, aggregation} = this.props;
        const selectedMeasurement              = selectedTimeScale === 'day' ? 'wxpackets' : 'wxrecords';
        return (
            <div>
                <div>
                    <Picker
                        value={selectedTimeScale}
                        onChange={this.handleChange}
                        options={['day', 'week', 'month', 'year']}
                    />
                </div>
                <div>
                    <PacketGroup
                        packet={this.props.measurements['wxpackets'].packets[this.props.measurements['wxpackets'].packets.length - 1]}
                        isFetching={this.props.measurements['wxpackets'].isFetching}/>
                </div>
                <div>
                    <TimeGroup
                        selectedTimeScale={selectedTimeScale}
                        aggregation={aggregation}
                        {...this.props.measurements[selectedMeasurement]} />
                </div>
            </div>
        );
    }
}

AppContainer.propTypes = propTypes;

function mapStateToProps(state) {
    return state;
}

export default connect(mapStateToProps)(AppContainer);