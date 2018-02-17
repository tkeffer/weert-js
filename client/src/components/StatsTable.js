/*
 * Copyright (c) 2017-2018 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as _ from 'lodash';
import Table from 'react-bootstrap/lib/Table';
import * as units from '../units';
import * as utility from '../utility';

const propTypes = {
    statsData     : PropTypes.object.isRequired,
    isFetching    : PropTypes.bool.isRequired,
    header        : PropTypes.string,
    timeFormat    : PropTypes.string,
    componentClass: PropTypes.string
};

const defaultProps = {
    header        : "Need a header!",
    timeFormat    : "HH:mm:ss D-MMM",
    componentClass: 'div'
};

function Line(props) {

    const {obsType, statsData, unitSystem, timeFormat, stats, componentClass: ComponentProp} = props;

    const Component = ComponentProp || 'span';

    return (
        <Component>
            {`${units.getValueString(obsType,
                                     utility.getNested([obsType, stats, "value"],
                                                       statsData),
                                     unitSystem)} at ` +
             `${units.getValueString("timestamp",
                                     utility.getNested([obsType, stats, "timestamp"],
                                                       statsData),
                                     unitSystem,
                                     timeFormat)}`
            }
        </Component>
    );
}

function MinMaxColumn(props) {

    const {obsType, statsData, unitSystem, timeFormat} = props;
    return (
        <td>
            <Line obsType={obsType} statsData={statsData} unitSystem={unitSystem} timeFormat={timeFormat}
                  stats={'min'}/>
            <br/>
            <Line obsType={obsType} statsData={statsData} unitSystem={unitSystem} timeFormat={timeFormat}
                  stats={'max'}/>
        </td>
    );
}

function MinMaxRow(props){
    const {obsType} = props;
    return (
        <tr>
            <td>Low {units.getLabel(obsType)}<br/>High {units.getLabel(obsType)}</td>
            <MinMaxColumn
                {...props}
            />
        </tr>

    )
}

/*
 * Place holder for a table holding statistics
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
            <Component>
                <h3>{header}</h3>
                {isFetching && _.isEmpty(statsData) && <h3>Loading...</h3>}
                {!isFetching && _.isEmpty(statsData) && <h3>Empty stats place holder</h3>}
                {!_.isEmpty(statsData) &&
                 <div style={{opacity: isFetching ? 0.5 : 1}}>
                     <Table bordered hover>
                         <tbody>
                         <tr>
                             <td>Max Wind Speed</td>
                             <Line
                                 obsType='wind_speed'
                                 statsData={statsData}
                                 unitSystem={unitSystem}
                                 timeFormat={timeFormat}
                                 stats='max'
                                 componentClass='td'
                             />
                         </tr>
                         <MinMaxRow
                             obsType='out_temperature'
                             statsData={statsData}
                             unitSystem={unitSystem}
                             timeFormat={timeFormat}
                         />
                         <MinMaxRow
                             obsType='in_temperature'
                             statsData={statsData}
                             unitSystem={unitSystem}
                             timeFormat={timeFormat}
                         />
                         <MinMaxRow
                             obsType='radiation_radiation'
                             statsData={statsData}
                             unitSystem={unitSystem}
                             timeFormat={timeFormat}
                         />
                         <MinMaxRow
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
