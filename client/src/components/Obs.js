/*
 * Copyright (c) 2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 *
 */

import React from 'react';
import * as units from '../units';
import {sprintf} from 'sprintf-js';

class ObsLabel extends React.Component {
    render() {
        return (<td className='stats_label'>{units.getLabel(this.props.obsType)}</td>);
    }
}

class ObsValue extends React.Component {
    render() {
        const {packet, obsType} = this.props;
        const val               = packet[obsType];
        let str_val;
        if (val === undefined) {
            str_val = "N/A";
        } else {
            const format = units.getUnitFormat(obsType, packet['unit_system']);
            const label  = units.getUnitLabel(obsType, packet['unit_system'], val);
            str_val      = sprintf(format, val) + label;
            console.log("packet=", packet);
            console.log("format=", format, "; label=", label);
        }
        console.log("str_val=", str_val);
        return (<td className='stats_data'>{str_val}</td>);
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
        return (<div className='stats_header'>
            Most Recent
        </div>);
    }

}

class Table extends React.Component {
    render() {
        return (<table>
            <tbody>
            {/* Include a key. See https://reactjs.org/docs/reconciliation.html#keys */}
            {this.props.obsTypes.map((obsType, i) => <ObsRow key={i} obsType={obsType} packet={this.props.packet}/>)}
            </tbody>
        </table>);
    }
}

export class PacketGroup extends React.Component {
    render() {
        return (<div>
                <Header/>
                <Table obsTypes={this.props.obsTypes} packet={this.props.packet}/>
            </div>
        );
    }

}
