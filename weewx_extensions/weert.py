#
#  Copyright (c) 2017 Tom Keffer <tkeffer@gmail.com>
#
#     See the file LICENSE for your full rights.
#

#
# See the WeeRT README file for instructions on how to install this uploader
# in weewx.
#

import json
import math
import threading
import Queue
import syslog
import sys

import configobj
from weeutil.weeutil import to_int

import weewx.restx

defaults_ini = """
[WeeRT]

    # The WeeRT server
    host = localhost
    port = 3000

    # A unique name for the location of the stream
    platform = default_platform

    # A unique name within the platform for the stream
    stream = default_stream

    # The "measurement" name (this is an InfluxDB terminology).
    measurement = wxpackets

    [[loop_filters]]
        # These items will be included in the post to the database.
        # The right-hand side can be any Python expression
        extra1_humidity = extraHumid1
        extra2_humidity = extraHumid2
        inside_humidity = inHumidity
        outside_humidity = outHumidity
        altimeter_pressure = altimeter
        sealevel_pressure = barometer
        gauge_pressure = pressure
        inside_temperature = inTemp
        outside_temperature = outTemp
        dewpoint_temperature = dewpoint
        windchill_temperature = windchill
        heatindex_temperature = heatindex
        extra1_temperature = extraTemp1
        extra2_temperature = extraTemp2
        extra3_temperature = extraTemp3
        leaf1_temperature = leafTemp1
        leaf2_temperature = leafTemp2
        soil1_temperature = soilTemp1
        soil2_temperature = soilTemp2
        soil3_temperature = soilTemp3
        soil4_temperature = soilTemp4
        inside_temperature_battery_status = inTempBatteryStatus
        outside_temperature_battery_status = outTempBatteryStatus
        rain_battery_status = rainBatteryStatus
        radiation_radiation = radiation
        rain_rain = rain
        unit_system = usUnits
        uv_uv = UV
        wind_speed = windSpeed
        wind_dir = windDir
        x_wind_speed = windSpeed * math.cos(math.radians(90.0 - windDir)) if (windDir is not None and windSpeed is not None) else None
        y_wind_speed = windSpeed * math.sin(math.radians(90.0 - windDir)) if (windDir is not None and windSpeed is not None) else None
        console_voltage = consBatteryVoltage
"""
import StringIO

weert_defaults = configobj.ConfigObj(StringIO.StringIO(defaults_ini))
del StringIO

class WeeRT(weewx.restx.StdRESTful):
    """Upload using to the WeeRT server."""

    def __init__(self, engine, config_dict):
        super(WeeRT, self).__init__(engine, config_dict)

        weert_dict = weewx.restx.get_site_dict(config_dict, 'WeeRT', 'host', 'port')
        if weert_dict is None:
            return

        # Check to make sure this version of weewx supports JSON posts.
        # To do this, look for function weewx.restx.RESTThread.get_post_body
        try:
            getattr(weewx.restx.RESTThread, 'get_post_body')
        except AttributeError:
            syslog.syslog(syslog.LOG_NOTICE, 'weert: WeeWX needs to be upgraded to V3.8 in order to run WeeRT')
            syslog.syslog(syslog.LOG_NOTICE, '****   WeeRT upload skipped')
            return

        # Start with the defaults. Make a copy --- we will be modifying it
        weert_config = configobj.ConfigObj(weert_defaults)['WeeRT']
        # Merge in the overrides from the config file
        weert_config.merge(weert_dict)

        # Get the database manager dictionary:
        manager_dict = weewx.manager.get_manager_dict_from_config(config_dict,
                                                                 'wx_binding')

        self.loop_queue = Queue.Queue()
        self.archive_thread = WeeRTThread(self.loop_queue, manager_dict,
                                          **weert_config)
        self.archive_thread.start()

        self.bind(weewx.NEW_LOOP_PACKET, self.new_loop_packet)
        syslog.syslog(syslog.LOG_INFO, "weert: LOOP packets will be posted")

    def new_loop_packet(self, event):
        self.loop_queue.put(event.packet)

class WeeRTThread(weewx.restx.RESTThread):
    """Thread that posts to an InfluxDB server"""

    def __init__(self, queue, manager_dict,
                 host, port,
                 measurement,
                 platform, stream,
                 loop_filters,
                 protocol_name="WeeRT",
                 post_interval=None, max_backlog=sys.maxint, stale=None,
                 log_success=True, log_failure=True,
                 timeout=10, max_tries=3, retry_wait=5, retry_login=3600,
                 softwaretype="weewx-%s" % weewx.__version__,
                 skip_upload=False):

        """
        Initializer for the WeeRThread class.

        Parameters specific to this class:

          host:
          port: The host and port of the WeeRT server

          measurement: The InfluxDB measurement name to use.

          platform: The platform name

          stream: The stream name

          loop_filters: A data structure holding what values are to be emitted.
        """
        super(WeeRTThread, self).__init__(queue,
                                          protocol_name=protocol_name,
                                          manager_dict=manager_dict,
                                          post_interval=post_interval,
                                          max_backlog=max_backlog,
                                          stale=stale,
                                          log_success=log_success,
                                          log_failure=log_failure,
                                          timeout=timeout,
                                          max_tries=max_tries,
                                          retry_wait=retry_wait,
                                          retry_login=retry_login,
                                          softwaretype=softwaretype,
                                          skip_upload=skip_upload)

        self.host = host
        self.port = to_int(port)
        self.measurement = measurement
        self.platform = platform
        self.stream = stream
        
        # Compile the filter functions for the loop packets:
        self.filter_funcs = _compile_filters(loop_filters)

    def format_url(self, packet):
        """Return the URL used to post to the WeeRT server"""

        url = "http://%s:%s/api/v1/measurements/%s/packets" % (self.host, self.port, self.measurement)
        return url

    def get_post_body(self, packet):
        """Supply the body and MIME type of the POST"""

        out_packet = {}
        # Subject all the types to be sent to a filter function.
        for k in self.filter_funcs:
            # This will include only types included in the filter functions.
            # If there is not enough information in the packet to support the filter
            # function (exception NameError), then it will be skipped.
            try:
                out_packet[k] = eval(self.filter_funcs[k], {"math": math}, packet)
            except NameError:
                pass

        body = {"measurement": self.measurement,
                     "tags"       : {"platform": self.platform, "stream"  : self.stream},
                     "timestamp"   : int(packet["dateTime"] * 1000000000),  # Convert to nanoseconds
                     "fields"     : out_packet
                    }
        json_body = json.dumps(body)
        return (json_body, 'application/json')

def _compile_filters(loop_filters):
    """Compile the filter statements"""
    filter_funcs = {}
    for obs_type in loop_filters:
        filter_funcs[obs_type] = compile(loop_filters[obs_type], "WeeRT", 'eval')
    return filter_funcs
