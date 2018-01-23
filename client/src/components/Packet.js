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

class ObsRow extends React.PureComponent {
    render() {
        return (<tr>
            <ObsLabel componentClass={'td'} obsType={this.props.obsType} />
            <ObsValue componentClass={'td'} obsType={this.props.obsType} packet={this.props.packet}/>
        </tr>);
    }
}

export default class PacketGroup extends React.PureComponent {
    render() {
        const {obsTypes, header, ...props} = this.props;
        return (
            <div>
                {header}
                <table>
                    <tbody>
                    {/* Include a key. See https://reactjs.org/docs/reconciliation.html#keys */}
                    {obsTypes.map((obsType, i) => <ObsRow key={i} obsType={obsType} {...props}/>)}
                    </tbody>
                </table>
            </div>
        );
    }
}

PacketGroup.propTypes = {
    header  : PropTypes.string,
    obsTypes: PropTypes.arrayOf(PropTypes.string).isRequired
};

PacketGroup.defaultProps = {
    header: "Current Values"
};