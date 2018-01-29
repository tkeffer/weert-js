/* Cribbed (with permission) from Peter Finley's "mesowx" project.
 https://bitbucket.org/lirpa/mesowx
 */

// Render and format a packet
import React from 'react';
import PropTypes from 'prop-types';

const propTypes = {
    packet        : PropTypes.object,
    isFetching    : PropTypes.bool,
    componentClass: PropTypes.string
};

const defaultProps = {
    packet        : undefined,
    isFetching    : false,
    componentClass: 'div'
};

/*
 * Place holder for the Wind Compass
 */
export default class WindCompass extends React.PureComponent {
    render() {
        const {componentClass: Component, packet, isFetching} = this.props;
        return (
            <Component>
                <p></p>
                {isFetching && !packet && <h3>Loading...</h3>}
                {!isFetching && !packet && <h3>Empty.</h3>}
                {packet &&
                 <div style={{opacity: isFetching ? 0.5 : 1}}>
                     <p>Place holder for the Wind Compass</p>
                     <p>Wind Speed: {packet['wind_speed']} at direction {packet['wind_dir']}</p>
                 </div>}
            </Component>
        );
    }
}

WindCompass.propTypes    = propTypes;
WindCompass.defaultProps = defaultProps;
