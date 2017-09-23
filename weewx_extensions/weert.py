#
#  Copyright (c) 2017 Tom Keffer <tkeffer@gmail.com>
#
#     See the file LICENSE for your full rights.
#

#
# See the WeeRT README file for instructions on how to install this uploader
# in weewx.
#

import math
import threading
import Queue
import syslog

import configobj

import weewx.restx

defaults_ini = """
[WeeRT]

    # The WeeRT server
    host = localhost
    port = 3000

    # A unique name for the location of the stream
    platform_name = default_platform

    # A unique name within the platform for the stream
    stream_name = default_stream

    # The "measurement" name (this is an InfluxDB terminology). 
    measurement = wxpackets

    [[loop_filters]]
        # These items will be included in the post to the database.
        # The right-hand side can be any Python expression
        UV = UV
        altimeter = altimeter
        barometer = barometer
        consBatteryVoltage = consBatteryVoltage
        extraHumid1 = extraHumid1
        extraHumid2 = extraHumid2
        extraTemp1 = extraTemp1
        extraTemp2 = extraTemp2
        extraTemp3 = extraTemp3
        inHumidity = inHumidity
        inTemp = inTemp
        inTempBatteryStatus = inTempBatteryStatus
        leafTemp1 = leafTemp1
        leafTemp2 = leafTemp2
        leafWet1 = leafWet1
        leafWet2 = leafWet2
        outHumidity = outHumidity
        outTemp = outTemp
        outTempBatteryStatus = outTempBatteryStatus
        pressure = pressure
        radiation = radiation
        rain = rain
        rainBatteryStatus = rainBatteryStatus 
        soilMoist1 = soilMoist1
        soilMoist2 = soilMoist2
        soilMoist3 = soilMoist3
        soilMoist4 = soilMoist4
        soilTemp1 = soilTemp1
        soilTemp2 = soilTemp2
        soilTemp3 = soilTemp3
        soilTemp4 = soilTemp4
        usUnits = usUnits
        xWind = windSpeed * math.cos(math.radians(90.0 - windDir)) if (windDir is not None and windSpeed is not None) else None
        yWind = windSpeed * math.sin(math.radians(90.0 - windDir)) if (windDir is not None and windSpeed is not None) else None
"""
import StringIO

weert_defaults = configobj.ConfigObj(StringIO.StringIO(defaults_ini))
del StringIO

class WeeRT(StdRESTful):
    """Upload using to the WeeRT server."""

    def __init__(self, engine, config_dict):
        super(WeeRT, self).__init__(engine, config_dict)

        weert_dict = weewx.restx.get_site_dict(config_dict, 'WeeRT', 'host', 'port')
        if weert_dict is None:
            return
        # Start with the defaults. Make a copy --- we will be modifying it
        weert_config = configobj.ConfigObj(weert_defaults)['WeeRT']
        # Merge in the overrides from the config file
        weert_config.merge(weert_dict)

        
        host = weert_dict['host']
        port = weert_dict['port']

        # Get the database manager dictionary:
        manager_dict = weewx.manager.getmanager_dict_from_config(config_dict, 
                                                                 'wx_binding')

        self.loop_queue = Queue.Queue()
        self.archive_thread = WeeRTThread(self.loop_queue, manager_dict,
                                          host, port,
                                          **weert_dict)
        self.archive_thread.start()

        self.bind(weewx.NEW_ARCHIVE_RECORD, self.new_archive_record)
        syslog.syslog(syslog.LOG_INFO, "restx: WeeRT: "
                                       "Data for station %s will be posted" % 
                                       weert_dict['station'])

    def new_loop_packet(self, event):
        self.loop_queue.put(event.packet)
        


class WeeRTThread(weewx.restx.RESTThread):
    """Thread that posts to an InfluxDB server"""

    def __init__(self, queue, manager_dict,
                 host, port,
                 measurement='wxpackets',
                 platform='default_platform', stream='default_stsream',
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
















# class WeeRT(weewx.restx.StdRESTful):
#     """Post to an InfluxDB server"""
# 
#     def __init__(self, engine, config_dict):
#         super(WeeRT, self).__init__(engine, config_dict)
# 
#         self.loop_queue = Queue.Queue()
# 
#         weert_dict = config_dict.get('WeeRT', {})
# 
#         self.loop_thread = WeeRTThread(self.loop_queue, weert_dict)
#         self.loop_thread.start()
# 
#         self.bind(weewx.NEW_LOOP_PACKET, self.new_loop_packet)
# 
#     def new_loop_packet(self, event):
#         self.loop_queue.put(event.packet)
# 
# 
# class WeeRTThread(threading.Thread):
#     """Thread that posts to an InfluxDB server"""
# 
#     def __init__(self, queue, weert_dict):
#         # Initialize my superclass:
#         threading.Thread.__init__(self, name="WeeRT-thread")
# 
#         self.queue = queue
# 
#         # Start with the defaults. Make a copy --- we will be modifying it
#         weert_config = configobj.ConfigObj(weert_defaults)['WeeRT']
#         # Merge in the overrides from the config file
#         weert_config.merge(weert_dict)
# 
#         # Extract out the WeeRT specific parts:
#         self.measurement = weert_config['measurement']
#         self.platform_name = weert_config['platform_name']
#         self.stream_name = weert_config['stream_name']
# 
#         # Compile the filter functions for the loop packets:
#         self.filter_funcs = _compile_filters(weert_config['loop_filters'])
# 
#         # Make sure the port is an integer:
#         self.host = weert_config['server']['port']
#         self.port = int(weert_config['server']['port'])
# 
#         # Initialize the client with the InfluxDB specific parts of the configuration:
#         self.client = influxdb.InfluxDBClient(**weert_config['influxdb'])
# 
#         # Create the InfluxDB database, if it hasn't already been created:
#         self.database_name = weert_config['influxdb']['database']
#         self.client.create_database(self.database_name)
# 
#         # Set up the continuous query:
#         cq = _form_cq(weert_config)
#         self.client.query(cq, database=self.database_name)
# 
#     def run(self):
#         """Run the thread"""
# 
#         post_to_log = True
# 
#         while True:
#             # This will block until a packet appears in the queue:
#             packet = self.queue.get()
# 
#             # A "None" packet is our signal to exit:
#             if packet is None:
#                 return
# 
#             out_packet = {}
#             # Subject all the types to be sent to a filter function.
#             for k in self.filter_funcs:
#                 # This will include only types included in the filter functions.
#                 # If there is not enough information in the packet to support the filter
#                 # function (exception NameError), then it will be skipped.
#                 try:
#                     out_packet[k] = eval(self.filter_funcs[k], {"math": math}, packet)
#                 except NameError:
#                     pass
# 
#             json_body = {"points": [{"measurement": self.measurement,
#                                      "tags"       : {
#                                          "platform_name": self.platform_name,
#                                          "stream_name"  : self.stream_name
#                                      },
#                                      "time"       : int(packet["dateTime"] * 1000000000),  # Convert to nanoseconds
#                                      "fields"     : out_packet
#                                      }
#                                     ]
#                          }
#             try:
#                 # The database must be sent as an undocumented param.
#                 self.client.write(json_body, params={'db': self.database_name})
#                 if not post_to_log:
#                     syslog.syslog(syslog.LOG_ERR, "post_influxdb: InfluxDB server back on line")
#                 post_to_log = True
#             except requests.exceptions.ConnectionError, e:
#                 if post_to_log:
#                     syslog.syslog(syslog.LOG_ERR, "post_influxdb: Unable to connect to InfluxDB server")
#                     syslog.syslog(syslog.LOG_ERR, "         ****  %s" % e)
#                     post_to_log = False
# 
# 
# def _compile_filters(loop_filters):
#     """Compile the filter statements"""
#     filter_funcs = {}
#     for obs_type in loop_filters:
#         filter_funcs[obs_type] = compile(loop_filters[obs_type], "WeeRT", 'eval')
#     return filter_funcs
# 
# 
# def _form_cq(weert_config):
#     """Form a continuous query statement from the configuration dictionary."""
#     aggs = []
#     agg_dict = weert_config['downsampling']['aggregation']
#     for k in agg_dict:
#         agg = agg_dict[k].lower()
#         # Offer 'avg' as a synonym for 'mean':
#         if agg == 'avg':
#             agg = 'mean'
#         aggs.append("%s(%s) as %s" % (agg, k, k))
# 
#     influx_sql = """CREATE CONTINUOUS QUERY "archive_%s" ON %s BEGIN
#                         SELECT %s
#                         INTO %s
#                         FROM %s
#                         GROUP BY time(%s)
#                     END""" % (weert_config['downsampling']['interval'],
#                               weert_config['influxdb']['database'],
#                               ', '.join(aggs),
#                               weert_config['downsampling']['measurement'],
#                               weert_config['measurement'],
#                               weert_config['downsampling']['interval'])
# 
#     return influx_sql
