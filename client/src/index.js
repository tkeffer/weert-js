/*
 * Copyright (c) 2016-2022 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

import React from "react";
import Root from "./containers/Root";

import { createRoot } from "react-dom/client";

import "./weert.css"

const container = document.getElementById("root");
const root = createRoot(container);
root.render(<Root />);
