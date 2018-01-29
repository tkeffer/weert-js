/*
 * Copyright (c) 2017-2018 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 *
 */
// Render and format a packet
import React from 'react';
import PropTypes from 'prop-types';
import { Table } from 'react-bootstrap';

import ObsRow from './ObsRow';

const propTypes = {
    packet        : PropTypes.object.isRequired,
    obsTypes      : PropTypes.arrayOf(PropTypes.string),
    header        : PropTypes.string,
    componentClass: PropTypes.string,
};

const defaultProps = {
    obsTypes      : ["timestamp", "sealevel_pressure", "out_temperature", "in_temperature"],
    header        : "Current Values",
    componentClass: 'div',
};

export default class PacketTable extends React.PureComponent {
    render() {
        const {componentClass: Component, obsTypes, header, packet} = this.props;
        return (
            <Component>
                <Table bordered hover>
                    <caption>{header}</caption>
                    <tbody>
                    {/* Include a key. See https://reactjs.org/docs/reconciliation.html#keys */}
                    {obsTypes.map((obsType, i) => <ObsRow obsType={obsType} packet={packet} key={i}/>)}
                    </tbody>
                </Table>
            </Component>
        );
    }
}

PacketTable.propTypes    = propTypes;
PacketTable.defaultProps = defaultProps;
