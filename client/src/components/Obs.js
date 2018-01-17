/*
 * Copyright (c) 2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 *
 */

import React from 'react';
import * as units from '../units';

class ObsLabel extends React.Component {
    render() {
        return (<td class='stats_label'>{units.getLabel(this.props.obsType)}</td>);
    }
}

class ObsValue extends React.Component {
    render() {
        return (<td class='stats_data'>{this.props.packet[this.props.obsType]}</td>);
    }
}


class ObsRow extends React.Component {
    render() {
        return (<tr>
            <ObsLabel obsType={this.props.obsType}/>
            <ObsValue obsType={this.props.obsType} packet={this.props.packet}/>
        </tr>);
    }
}



class Header extends React.Component {
    render() {
        return (<div class='stats_header'>
            Current Conditions
        </div>);
    }

}

class Table extends React.Component {
    render() {
        return (<table>
            <tbody>
            <ObsRow obsType={"timestamp"} value={props.timestamp}/>
            </tbody>
        </table>);
    }
}

class CurrentGroup extends React.Component {
    render() {
        return (<div>
                <StatsHeader/>
                <StatsTable/>
            </div>
        );
    }

}
