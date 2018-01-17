import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {
    selectSeries,
    fetchSeriesIfNeeded,
    invalidateSeries
} from '../actions';
import Picker from '../components/Picker';

// import Posts from '../components/Posts';

class AsyncApp extends Component {
    constructor(props) {
        super(props);
        this.handleChange       = this.handleChange.bind(this);
        this.handleRefreshClick = this.handleRefreshClick.bind(this);
    }

    componentDidMount() {
        const {dispatch, selectedSeries} = this.props;
        dispatch(fetchSeriesIfNeeded(selectedSeries));
    }

    componentDidUpdate(prevProps) {
        if (this.props.selectedSeries !== prevProps.selectedSeries) {
            const {dispatch, selectedSeries} = this.props;
            dispatch(fetchSeriesIfNeeded(selectedSeries));
        }
    }

    handleChange(nextSeries) {
        this.props.dispatch(selectSeries(nextSeries));
        this.props.dispatch(fetchSeriesIfNeeded(nextSeries));
    }

    handleRefreshClick(e) {
        e.preventDefault();

        const {dispatch, selectedSeries} = this.props;
        dispatch(invalidateSeries(selectedSeries));
        dispatch(fetchSeriesIfNeeded(selectedSeries));
    }

    render() {
        const {selectedSeries, packets, isFetching, lastUpdated} = this.props;
        return (
            <div>
                <Picker
                    value={selectedSeries}
                    onChange={this.handleChange}
                    options={['recent', 'last27']}
                />
                <p>
                    {lastUpdated &&
                     <span>
              Last updated at {new Date(lastUpdated).toLocaleTimeString()}.
                         {' '}
            </span>}
                    {!isFetching &&
                     <a href='#' onClick={this.handleRefreshClick}>
                         Refresh
                     </a>}
                </p>
                {isFetching && packets.length === 0 && <h2>Loading...</h2>}
                {!isFetching && packets.length === 0 && <h2>Empty.</h2>}
                {packets.length > 0 &&
                 <div style={{opacity: isFetching ? 0.5 : 1}}>
                     <p>Packets = {packets.length}</p>
                 </div>}
            </div>
        );
    }
}

AsyncApp.propTypes = {
    selectedSeries: PropTypes.string.isRequired,
    packets       : PropTypes.array.isRequired,
    isFetching    : PropTypes.bool.isRequired,
    lastUpdated   : PropTypes.number,
    dispatch      : PropTypes.func.isRequired
};


function mapStateToProps(state) {
    const {selectedSeries, packetsBySeriesName} = state;

    const {
              seriesTags,
              isFetching,
              maxAge,
              packets,
              lastUpdated,
          } = packetsBySeriesName[selectedSeries] || {isFetching: true, packets: []};

    return {
        selectedSeries,
        seriesTags,
        isFetching,
        maxAge,
        packets,
        lastUpdated,
    };
}

export default connect(mapStateToProps)(AsyncApp);