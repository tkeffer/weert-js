#
#  Copyright (c) 2015-2016 Tom Keffer <tkeffer@gmail.com>
#
#     See the file LICENSE for your full rights.
#

#
# See the WeeRT README file for instructions on how to install this uploader
# in weewx.
#

import json
import os.path
import sys
import syslog
import time
import urlparse
import urllib
import urllib2
import Queue

import weewx.units
import weewx.restx

from weewx.restx import StdRESTful, RESTThread

DEFAULT_WEERT_HOST = "http://localhost:3000"
USER_ENDPOINT = "/api/v1/users/"
STREAM_ENDPOINT = "/api/v1/streams/"

class WeeRT(StdRESTful):
    """Weewx service for posting using to a Node RESTful server.
    
    Manages a separate thread WeeRTThread"""

    def __init__(self, engine, config_dict):
        
        super(WeeRT, self).__init__(engine, config_dict)

        # Get the WeeRT options. The options 'stream_name', 'username', 
        # and 'password' are required
        _weert_dict = weewx.restx.get_site_dict(config_dict, 'WeeRT', 
                                                'stream_name', 'username', 'password')

        if _weert_dict is None:
            return

        # Get the database manager dictionary:
        _manager_dict = weewx.manager.get_manager_dict_from_config(config_dict,
                                                                   'wx_binding')
        self.loop_queue = Queue.Queue()
        self.loop_thread = WeeRTThread(self.loop_queue,
                                       _manager_dict,
                                       **_weert_dict)
        self.loop_thread.start()
        self.bind(weewx.NEW_LOOP_PACKET, self.new_loop_packet)

        syslog.syslog(syslog.LOG_INFO, "weert: LOOP packets will be posted.")

    def new_loop_packet(self, event):
        self.loop_queue.put(event.packet)


class WeeRTThread(RESTThread):
    """Concrete class for threads posting to a Node server"""
    

    default_obs_types = ['outTemp',
                         'dewpoint',
                         'inTemp',
                         'outHumidity',
                         'barometer',
                         'windSpeed',
                         'windDir',
                         'dayRain']
    
    # Maps from weewx names, to the names used in WeeRT:
    map = {'outTemp'    : 'outside_temperature',
           'dewpoint'   : 'dewpoint_temperature',
           'inTemp'     : 'inside_temperature',
           'outHumidity': 'outside_humidity',
           'barometer'  : 'barometer_pressure',
           'windSpeed'  : 'wind_speed',
           'windDir'    : 'wind_direction',
           'dayRain'    : 'day_rain'}

    def __init__(self, queue,
                 manager_dict,
                 username,
                 password,
                 stream_name = None,
                 protocol_name="WeeRT",
                 weert_host=DEFAULT_WEERT_HOST,
                 obs_types=default_obs_types,
                 max_backlog=sys.maxint, stale=60,
                 log_success=True, log_failure=True,
                 timeout=5, max_tries=1, retry_wait=5):

        """
        Initializer for the WeeMetThread class.
        
        Either stream_id or stream_name must be supplied.
        
        Required parameters:

          queue: An instance of Queue.Queue where the packets will appear.
          
          manager_dict: The database manager dictionary to be used for database
          lookups.
          
          stream_name: A unique name for the stream. Required.
        
        Optional parameters:
        
          weert_host: The URL for the WeeRT Node server. E.g., http://localhost:3000
        
          obs_types: A list of observation types to be sent to the Node
          server [optional]
        
          max_backlog: How many records are allowed to accumulate in the queue
          before the queue is trimmed.
          Default is sys.maxint (essentially, allow any number).
          
          stale: How old a record can be and still considered useful.
          Default is 60 (a minute).
          
          log_success: If True, log a successful post in the system log.
          Default is True.
          
          log_failure: If True, log an unsuccessful post in the system log.
          Default is True.
          
          max_tries: How many times to try the post before giving up.
          Default is 1
          
          timeout: How long to wait for the server to respond before giving up.
          Default is 5 seconds.        

          retry_wait: How long to wait between retries when failures.
          Default is 5 seconds.
        """        
        # Initialize my superclass
        super(WeeRTThread, self).__init__(queue,
                                          protocol_name=protocol_name,
                                          manager_dict=manager_dict,
                                          max_backlog=max_backlog,
                                          stale=stale,
                                          log_success=log_success,
                                          log_failure=log_failure,
                                          timeout=timeout,
                                          max_tries=max_tries,
                                          retry_wait=retry_wait)

        self.obs_types = obs_types

        # This will be something like http://localhost:3000/api/v1/users
        user_endpoint_url = urlparse.urljoin(weert_host, USER_ENDPOINT)
        # Authenticate and get a token from the server:
        self.token = get_token(user_endpoint_url, username, password)

        # This will be something like http://localhost:3000/api/v1/streams
        stream_endpoint_url = urlparse.urljoin(weert_host, STREAM_ENDPOINT)

        # Form an URL from the stream name:
        streamname_url = self.get_stream_url(stream_endpoint_url, stream_name)

        # Then form an URL for the packet stream        
        self.packets_url = streamname_url.rstrip(' /') + '/packets'

        syslog.syslog(syslog.LOG_NOTICE, "weert: Publishing to %s" % self.packets_url)

    def process_record(self, record, dbmanager):
        """Specialized version of process_record that posts to a node server."""

        # Get the full record by querying the database ...
        full_record = self.get_record(record, dbmanager)
        # ... convert to Metric if necessary ...
        metric_record = weewx.units.to_METRICWX(full_record)
        
        # Instead of sending every observation type, send only those in
        # the list obs_types
        abridged = dict((x, metric_record.get(x)) for x in self.obs_types)
        
        # Convert timestamps to JavaScript style:
        abridged['timestamp'] = record['dateTime'] * 1000
        
        mapped = {}
        for k in abridged:
            new_k = WeeRTThread.map.get(k, k)
            mapped[new_k] = abridged[k] 
        
        req = urllib2.Request(self.packets_url)
        req.add_header('Content-Type', 'application/json')
        req.add_header("User-Agent", "weewx/%s" % weewx.__version__)
        req.add_header("Authorization", "Bearer %s" % self.token)

        self.post_with_retries(req, payload=json.dumps(mapped))
        
    def checkresponse(self, response):
        """Check the HTTP response code."""
        if response.getcode() == 201:
            # Success. Just return
            return
        else:
            for line in response:
                if line.startswith('Error'):
                    # Server signals an error. Raise an exception.
                    raise weewx.restx.FailedPost(line)

    def get_stream_url(self, stream_endpoint_url, stream_name):
    
        """Given a stream_name, return its URL. If a stream has not been
        allocated on the server, allocate one, and return that URL.
        
        stream_endpoint_url: The endpoint for WeeRT streams queries. Something
        like http://localhost:3000/api/v1/streams
        
        stream_name: A unique name for the stream
        """
         
        # First see if the stream name is already on the server    
        stream_url = self.lookup_streamURL(stream_endpoint_url, stream_name)
    
        if stream_url:
            # It has. Return it.
            return stream_url
        
        # The stream has not been allocated. Ask the server to allocate one for us. 
        # Build the request
        req = urllib2.Request(stream_endpoint_url)
        req.add_header('Content-Type', 'application/json')
        req.add_header("User-Agent", "weewx/%s" % weewx.__version__)
        req.add_header("Authorization", "Bearer %s" % self.token)
        
        # Set up the stream metadata:
        payload = json.dumps({"_id" : stream_name,
                              "description" :"Stream for weewx",
                              "unit_group" : "METRICWX"})
        
        # Now send it off
        response = urllib2.urlopen(req, data=payload)
        
        # Check the response code.
        if response.code == 201:
            # All is OK. Get the URL of the newly minted stream out 
            # of the location field:
            stream_url = response.info()['location']
        else:
            stream_url = None
    
        return stream_url


    def lookup_streamURL(self, stream_endpoint_url, stream_name):
        """Given a stream_name, ask the server what its URL is.
        Return None if not found.
        
        stream_endpoint_url: The endpoint for WeeRT streams queries. Something
        like http://localhost:3000/api/v1/streams
        
        stream_name: A unique name for the stream
        """
         
        # Query to look for a "name" field that matches the stream name
        query = {"_id":{"$eq": stream_name}}
        # Encode it with the proper escapes
        param = urllib.urlencode({'query':json.dumps(query)})
        # Form the full URL
        full_url = urlparse.urljoin(stream_endpoint_url, '?%s' % param)

        # Build the request    
        req = urllib2.Request(full_url)
        req.add_header('Content-Type', 'application/json')
        req.add_header("User-Agent", "weewx/%s" % weewx.__version__)
        req.add_header("Authorization", "Bearer %s" % self.token)
        
        # Hit the server
        response = urllib2.urlopen(req)
        result = response.read()
        urlarray = json.loads(result)
        return str(urlarray[0]) if urlarray else None

def get_token(user_endpoint_url, username, password):
    
    params = urllib.urlencode({"password":password})
    
    if not user_endpoint_url.endswith('/'):
        user_endpoint_url += '/'
    full_url = user_endpoint_url + username + '/token?' + params
    
    response = urllib2.urlopen(full_url)
    result = response.read()
    token = json.loads(result)
    return token
