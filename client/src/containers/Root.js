/*
 * Copyright (c) 2016-2022 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

import React from "react";
import { Provider } from "react-redux";

import configureStore from "../configureStore";
import AppContainer from "./AppContainer";

const store = configureStore();

export default class Root extends React.PureComponent {
  render() {
    return (
      <Provider store={store}>
        <AppContainer />
      </Provider>
    );
  }
}
