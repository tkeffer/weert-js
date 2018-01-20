/*
 * Copyright (c) 2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 *
 */
// Render and format a packet
import React from 'react';
import PropTypes from 'prop-types';

import ObsLabel from './ObsLabel';
import ObsValue from './ObsValue';

class ObsRow extends React.Component {
    render() {
        return (<tr>
            <ObsLabel componentClass={'td'} {...this.props}/>
            <ObsValue componentClass={'td'} {...this.props}/>
        </tr>);
    }
}

class Header extends React.Component {
    render() {
        return (<div>
            Most Recent
        </div>);
    }
}

class Table extends React.Component {
    render() {
        const {obsTypes, ...props} = this.props;
        return (<table>
            <tbody>
            {/* Include a key. See https://reactjs.org/docs/reconciliation.html#keys */}
            {obsTypes.map((obsType, i) => <ObsRow key={i} obsType={obsType} {...props}/>)}
            </tbody>
        </table>);
    }
}

export default class PacketGroup extends React.Component {
    render() {
        return (<div>
                <Header/>
                <Table {...this.props}/>
            </div>
        );
    }
}
