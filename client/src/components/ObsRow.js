/*
 * Copyright (c) 2016-2022 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

import React from "react";
import PropTypes from "prop-types";
import isEmpty from "lodash/isEmpty";

import ObsLabel from "./ObsLabel";
import ObsValue from "./ObsValue";

const propTypes = {
  obsType: PropTypes.string.isRequired,
  packet: PropTypes.object,
  isFetching: PropTypes.bool
};

const defaultProps = {
  isFetching: false
};

export default class ObsRow extends React.PureComponent {
  render() {
    const { packet, obsType, isFetching } = this.props;
    let value, unitSystem;
    if (!isEmpty(packet)) {
      value = packet[obsType];
      unitSystem = packet["unit_system"];
    }

    return (
      <tr>
        <td className="label">
          <ObsLabel obsType={obsType} />
        </td>
        <td className="data">
          <ObsValue
            obsType={obsType}
            value={value}
            unitSystem={unitSystem}
            isFetching={isFetching}
          />
        </td>
      </tr>
    );
  }
}

ObsRow.propTypes = propTypes;
ObsRow.defaultProps = defaultProps;
