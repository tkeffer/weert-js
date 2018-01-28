import React from 'react';
import PropTypes from 'prop-types';

import PacketTable from './PacketTable';
import WindCompass from './WindCompass';

const propTypes = {
    isFetching      : PropTypes.bool.isRequired,
    packet          : PropTypes.object,
    componentClass  : PropTypes.string,
    PacketTableProps: PropTypes.shape({
                                          obstypes      : PropTypes.arrayOf(PropTypes.string),
                                          header        : PropTypes.string,
                                          componentClass: PropTypes.string,
                                      }),
    WindCompassProps: PropTypes.shape({
                                          componentClass: PropTypes.string,
                                      }),
};

const defaultProps = {
    componentClass: 'div'
};

/**
 * Component displaying the most recent packet
 */
export default class PacketGroup extends React.PureComponent {

    render() {
        const {isFetching, packet, PacketTableProps, WindCompassProps} = this.props;
        return (
            <div>
                {isFetching && !packet && <h2>Loading...</h2>}
                {!isFetching && !packet && <h2>Empty.</h2>}
                {packet &&
                 <div style={{opacity: isFetching ? 0.5 : 1}}>
                     <PacketTable {...PacketTableProps} packet={packet}/>
                     <WindCompass {...WindCompassProps} wind_speed={packet['wind_speed']}
                                  wind_dir={packet['wind_dir']}/>
                 </div>}
            </div>
        );
    }
}

PacketGroup.propTypes    = propTypes;
PacketGroup.defaultProps = defaultProps;
