/*
 * Copyright (c) 2016-2022 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

import * as api from "../Api";
import * as utility from "../utility";

export const SELECT_TAGS = "SELECT_TAGS";
export const SELECT_TIME_SPAN = "SELECT_TIME_SPAN";
export const SELECT_TIME_DETAIL = "SELECT_TIME_DETAIL";
export const FETCH_TIMESPAN_IN_PROGRESS = "FETCH_TIMESPAN_IN_PROGRESS";
export const FETCH_TIMESPAN_SUCCESS = "FETCH_TIMESPAN_SUCCESS";
export const FETCH_TIMESPAN_FAILURE = "FETCH_TIMESPAN_FAILURE";
export const FETCH_STATS_IN_PROGRESS = "FETCH_STATS_IN_PROGRESS";
export const FETCH_STATS_SUCCESS = "FETCH_STATS_SUCCESS";
export const FETCH_STATS_FAILURE = "FETCH_STATS_FAILURE";
export const NEW_PACKET = "NEW_PACKET";
export const FETCH_ABOUT_IN_PROGRESS = "FETCH_ABOUT_IN_PROGRESS";
export const FETCH_ABOUT_SUCCESS = "FETCH_ABOUT_SUCCESS";
export const FETCH_ABOUT_FAILURE = "FETCH_ABOUT_FAILURE";

// Select a new set of tags (such as platform or stream).
export function selectTags(tags) {
  return {
    type: SELECT_TAGS,
    tags
  };
}

// Select a new time span, e.g., 'recent', 'day', 'month', to display
export function selectTimeSpan(timeSpan) {
  return {
    type: SELECT_TIME_SPAN,
    timeSpan
  };
}

// Select a new time detail (e.g., 5, 10, 20 minutes) to display
export function selectTimeDetail(timeDetail) {
  return {
    type: SELECT_TIME_DETAIL,
    timeDetail
  };
}

// Issued when there is a fetch in progress for time span packets ('recent', 'day', 'week', etc.)
function fetchTimeSpanInProgress(timeSpan) {
  return {
    type: FETCH_TIMESPAN_IN_PROGRESS,
    timeSpan
  };
}

function receiveTimeSpan(timeSpan, packets) {
  return {
    type: FETCH_TIMESPAN_SUCCESS,
    timeSpan,
    packets: packets.map(packet => {
      // Flatten the packets:
      return {
        timestamp: packet.timestamp,
        ...packet.fields
      };
    })
  };
}

function receiveTimeSpanFailed(timeSpan, err) {
  return {
    type: FETCH_TIMESPAN_FAILURE,
    timeSpan,
    err
  };
}

function fetchTimeSpan(measurement, tags, timeSpan, options) {
  return dispatch => {
    // Let the world know that a fetch is in progress
    dispatch(fetchTimeSpanInProgress(timeSpan));
    const start = Date.now() - options.maxAge;
    const stop = undefined;
    return api
      .getPackets(measurement, tags, start, stop, options.aggregation)
      .then(packets => dispatch(receiveTimeSpan(timeSpan, packets)))
      .catch(err => dispatch(receiveTimeSpanFailed(timeSpan, err)));
  };
}

function shouldFetchTimeSpan(timeSpanState, newOptions) {
  // If a fetch is in progress, don't do another fetch
  if (timeSpanState.isFetching) {
    return false;
  }

  // If the time span options have changed, do a fetch
  if (!utility.isSame(timeSpanState.options, newOptions)) {
    return true;
  }

  // If we don't have any packets for this time span, do a fetch
  return !(timeSpanState.packets && timeSpanState.packets.length);
}

export function fetchTimeSpanIfNeeded(timeSpan, newOptions) {
  return (dispatch, getState) => {
    const state = getState();
    const timeSpanState = state["timeSpans"][timeSpan];

    if (shouldFetchTimeSpan(timeSpanState, newOptions)) {
      const { selectedTags } = state;
      const { measurement } = timeSpanState;
      return dispatch(fetchTimeSpan(measurement, selectedTags, timeSpan, newOptions));
    }
  };
}

function newPacket(measurement, packet) {
  return {
    type: NEW_PACKET,
    measurement,
    packet: {
      timestamp: packet.timestamp,
      ...packet.fields
    }
  };
}

export function subscribeMeasurement(measurement, tags) {
  return (dispatch, getState) => {
    return api.subscribe(measurement, tags, packet => {
      return dispatch(newPacket(measurement, packet));
    });
  };
}

// Issued when there is a fetch in progress for some statistics
function fetchStatsInProgress(timeSpan) {
  return {
    type: FETCH_STATS_IN_PROGRESS,
    timeSpan
  };
}

function receiveStats(timeSpan, stats) {
  return {
    type: FETCH_STATS_SUCCESS,
    timeSpan,
    stats
  };
}

function receiveStatsFailed(timeSpan, err) {
  return {
    type: FETCH_STATS_FAILURE,
    timeSpan,
    err
  };
}

function fetchStats(measurement, tags, timeSpan) {
  return dispatch => {
    // Let the world know that a fetch is in progress
    dispatch(fetchStatsInProgress(timeSpan));
    return api
      .getStats(measurement, tags, timeSpan)
      .then(stats => dispatch(receiveStats(timeSpan, stats)))
      .catch(err => dispatch(receiveStatsFailed(timeSpan, err)));
  };
}

function shouldFetchStats(statsState) {
  if (statsState.isFetching) return false;
  // TODO: Might be able to optimize this if we knew whether the existing stats were out of date.
  // For now, always fetch
  return true;
}

export function fetchStatsIfNeeded(timeSpan) {
  return (dispatch, getState) => {
    const state = getState();
    const statsState = state.stats[timeSpan];

    if (shouldFetchStats(statsState)) {
      const { selectedTags } = state;
      const { measurement } = statsState;
      return dispatch(fetchStats(measurement, selectedTags, timeSpan));
    }
  };
}

function fetchAboutInProgress() {
  return {
    type: FETCH_ABOUT_IN_PROGRESS
  };
}

function receiveAbout(about) {
  return {
    type: FETCH_ABOUT_SUCCESS,
    about
  };
}

function receiveAboutFailed(err) {
  return {
    type: FETCH_ABOUT_FAILURE,
    err
  };
}

export function fetchAbout() {
  return dispatch => {
    // Let the world know that a fetch is in progress
    dispatch(fetchAboutInProgress());
    return api
      .getAbout()
      .then(about => dispatch(receiveAbout(about)))
      .catch(err => dispatch(receiveAboutFailed(err)));
  };
}
