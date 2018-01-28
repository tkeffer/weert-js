/* Cribbed (with permission) from Peter Finley's "mesowx" project.
 https://bitbucket.org/lirpa/mesowx
 */

// Render and format a packet
import React from 'react';
import PropTypes from 'prop-types';

const propTypes = {
    wind_speed    : PropTypes.number.isRequired,
    wind_dir      : PropTypes.number.isRequired,
    componentClass: PropTypes.string
};

const defaultProps = {
    componentClass: 'div'
};

/*
 * Place holder for the Wind Compass
 */
export default class WindCompass extends React.PureComponent {
    render() {
        const {componentClass: Component, wind_speed, wind_dir} = this.props;
        return (
            <Component>
                <p></p>
                <p>Place holder for the Wind Compass</p>
                <p>Wind Speed: {wind_speed} at direction {wind_dir}</p>
            </Component>
        );
    }
}

WindCompass.propTypes    = propTypes;
WindCompass.defaultProps = defaultProps;
