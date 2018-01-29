/*
 * Copyright (c) 2017-2018 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 *
 */
// Render and format a packet
import React from 'react';
import PropTypes from 'prop-types';
import {Table} from 'react-bootstrap';

import ObsRow from './ObsRow';

const propTypes = {
    packet        : PropTypes.object,
    obsTypes      : PropTypes.arrayOf(PropTypes.string),
    header        : PropTypes.string,
    isFetching    : PropTypes.bool,
    componentClass: PropTypes.string,
};

const defaultProps = {
    packet        : undefined,
    obsTypes      : ["timestamp", "sealevel_pressure", "out_temperature", "in_temperature"],
    header        : "Current Values",
    isFetching    : true,
    componentClass: 'div',
};

export default class PacketTable extends React.PureComponent {
    render() {
        const {componentClass: Component, obsTypes, header, isFetching, packet} = this.props;
        return (
            <Component>
                {isFetching && !packet && <h3>Loading...</h3>}
                {!isFetching && !packet && <h3>Empty.</h3>}
                {packet &&
                 <div style={{opacity: isFetching ? 0.5 : 1}}>
                     <Table bordered hover>
                         <caption>{header}</caption>
                         <tbody>
                         {/* Include a key. See https://reactjs.org/docs/reconciliation.html#keys */}
                         {obsTypes.map((obsType, i) => <ObsRow obsType={obsType} packet={packet} key={i}/>)}
                         </tbody>
                     </Table>
                 </div>}
            </Component>
        );
    }
}

PacketTable.propTypes    = propTypes;
PacketTable.defaultProps = defaultProps;
