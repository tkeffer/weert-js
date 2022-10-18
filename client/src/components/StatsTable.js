/*
 * Copyright (c) 2016-2022 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

import React from 'react';
import PropTypes from 'prop-types';
import isEmpty from 'lodash/isEmpty';
import {Table} from 'react-bootstrap';
import * as units from '../units';
import * as utility from '../utility';

const propTypes = {
    statsData     : PropTypes.object.isRequired,
    isFetching    : PropTypes.bool.isRequired,
    header        : PropTypes.string,
    timeFormat    : PropTypes.string,
    componentClass: PropTypes.string,
};

const defaultProps = {
    header        : "Need a header!",
    timeFormat    : "HH:mm:ss D-MMM",
    componentClass: 'div',
};

/* Return a rendering for a value at a certain time. */
function ValueAt(props) {

    const {obsType, statsData, unitSystem, timeFormat, stats} = props;

    return (
        <span>
            {`${units.getValueString(obsType,
                                     utility.getNested([obsType, stats, "value"],
                                                       statsData),
                                     unitSystem)}`}

            {obsType === 'wind_speed' && ` from ${units.getValueString('wind_dir',
                                                                       utility.getNested(['wind_speed', stats, "dir"],
                                                                                         statsData),
                                                                       unitSystem)}`}

            {` at ${units.getValueString("timestamp",
                                        utility.getNested([obsType, stats, "timestamp"],
                                                          statsData),
                                        unitSystem,
                                        timeFormat)}`
            }
        </span>
    );
}


/* Return a rendering for min and max values for a specific observation type */
function MinMaxValues(props) {
  const {obsType, statsData, unitSystem, timeFormat} = props;

    return (
      <React.Fragment>
        <tr>
          <td className="label">
            Low {units.getLabel(obsType)}
          </td>
          <td className="data">
            <ValueAt obsType={obsType} statsData={statsData} unitSystem={unitSystem} timeFormat={timeFormat}
                     stats={'min'}/>
          </td>
        </tr>
        <tr>
          <td className="label">
            High {units.getLabel(obsType)}
          </td>
          <td className="data">
            <ValueAt obsType={obsType} statsData={statsData} unitSystem={unitSystem} timeFormat={timeFormat}
                     stats={'max'}/>
          </td>
        </tr>
      </React.Fragment>
    )
}

function MaxWind(props) {
  const {obsType, statsData, unitSystem, timeFormat} = props;

  return (
    <div>
      <tr>
        <td className="label">
          Max Wind Speed
        </td>
        <td className="data">
          <td className="data">
            <ValueAt
              obsType='wind_speed'
              statsData={statsData}
              unitSystem={unitSystem}
              timeFormat={timeFormat}
              stats='max'
            />
          </td>
        </td>
      </tr>
    </div>
  )
}

/*
 * A table holding statistics
 */
export default class StatsTable extends React.PureComponent {
    render() {
        const {statsData, isFetching, header, timeFormat, componentClass: Component} = this.props;

        // Extract the unit system in use
        let unitSystem = utility.getNested(['unit_system', 'max', 'value'], statsData);
        // Make sure the min and max unit_system match. Otherwise, the database uses mixed unit systems
        // and we don't know how to deal with that.
        if (unitSystem === null || unitSystem !== utility.getNested(['unit_system', 'min', 'value'], statsData)) {
            unitSystem = undefined;
        }

        return (
            <Component className="stats_table">
                <div className="widget_title">{header}</div>
                {isFetching && isEmpty(statsData) && <h3>Loading...</h3>}
                {!isFetching && isEmpty(statsData) && <h3>Empty stats place holder</h3>}
                {!isEmpty(statsData) &&
                 <div style={{opacity: isFetching ? 0.5 : 1}}>
                     <Table bordered hover>
                       <tbody>
                       <MinMaxValues
                         obsType='wind_speed'
                         statsData={statsData}
                         unitSystem={unitSystem}
                         timeFormat={timeFormat}
                       />
                       <MinMaxValues
                         obsType='out_temperature'
                         statsData={statsData}
                         unitSystem={unitSystem}
                         timeFormat={timeFormat}
                       />
                       <MinMaxValues
                         obsType='in_temperature'
                         statsData={statsData}
                         unitSystem={unitSystem}
                         timeFormat={timeFormat}
                       />
                       <MinMaxValues
                         obsType='radiation_radiation'
                         statsData={statsData}
                         unitSystem={unitSystem}
                         timeFormat={timeFormat}
                       />
                       <MinMaxValues
                         obsType='sealevel_pressure'
                         statsData={statsData}
                         unitSystem={unitSystem}
                         timeFormat={timeFormat}
                       />
                       </tbody>
                     </Table>
                 </div>}
            </Component>
        );
    }
}

StatsTable.propTypes    = propTypes;
StatsTable.defaultProps = defaultProps;
