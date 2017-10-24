# WeeRT
A real-time logging and display server, using Node, Express, and InfluxDB.

This utility is still EXPERIMENTAL, and will require some skill to install and administer.

## Installing the server

1. Download and install [InfluxDB](https://www.influxdata.com/). WeeRT was tested with
version 1.3.5. Later versions should work fine.

2. If necessary, start it by whatever means is needed for your operating system. This works
on Ubuntu 16.04:

  ```shell
  $ systemctl start influxdb
  ```

3. Download and install [node](https://nodejs.org/en/). WeeRT was tested with version 6.9.5.
Later versions should work fine.

4. Download WeeRT from the git repository

  ```shell
  $ git clone https://github.com/tkeffer/weert-js.git
  ```

5. Enter the directory, and install the dependencies

  ```shell
  $ cd weert-js
  $ npm install
  ```

6. Start the WeeRT server

  ```shell
  $ npm start
  Listening on port 3000
  ```

7. To run the test suites, in another shell download and install `jasmine` globally

  ```shell
  $ npm install -g jasmine
  ```

8. Run the suites

  ```shell
  $ npm test
  ```

## Installing the WeeRT uploader on WeeWX

1. Make sure you are running WeeWX V3.8 or later. Earlier versions do
not support the POST method used by the uploader.

2. Put the `weert.py` module in the WeeWX `user` subdirectory.

3. Add the following to `weewx.conf`:

    ```ini
    [StdRestful]
        ...
        [[WeeRT]]
            host = localhost
            port = 3000
            user = weert
            password = weert

    ...

    [Engine]
        [[Services]]
            ...
            restful_services = ..., user.weert.WeeRT
    ```

4. Run `weewxd`

5. Open up a client at [http://localhost:3000](http://localhost:3000).


## General architecture
- Uses a [Node](https://nodejs.org/) server with the [Express framework](http://expressjs.com/).
- The server offers a RESTful API ([described below](#API)) for storing, retrieving,
  and deleting data measurements.
- Data are stored in a [InfluxDB](https://www.influxdata.com/) server.
- Realtime updates are done through a publish - subscribe interface
  using [Faye](http://faye.jcoglan.com).
- Realtime plots are done using [plotly.js](https://plot.ly/javascript/)

For experimental purposes.

## Notes

### Pub-sub

When new LOOP packets come into WeeRT through the POST interface, they
are published using Faye. Interested clients can subscribe to these
publications.

### Continuous queries

The WeeRT server arranges to have a continuous query run on each LOOP
measurement, which will subsample the data, typically every 5
minutes. See file `config/cq_policies.js` for the subsampling
policies.  File `meta_data/measurement_config.json` sets which policy
each LOOP measurement uses.

The resulting aggregated record is put in a new measurement whose name
is set in `meta_data/measurement_config.json`. Unfortunately, InfluxDB
does not have a trigger mechanism for when new records
appear. Instead, we have to set up a timer, which goes off a few seconds
after a new aggregation is due. This is then used to send out a notice
to any subscriber through Faye.

Another limitation is that when continuous queries run and aggregate
data, they use a timestamp at the *beginning* of the aggregation. For
example, if aggregating all LOOP packets between 0930 and 0935, they
will be timestamped 0930. When it comes time to plot the resulting
data, they will be displayed five minutes too early. The WeeRT server
includes a hack to shift the timestamp of series resulting from CQs
(option `timeshift` in `meta_data/measurement_config.json`.

### Retention policy

The retention time of the LOOP packets is set by a configuration file,
but the default is 24 hours. After that, they are discarded.

### Log entries

WeeRT can make voluminous entries into your system log. The WeeWX
uploader will make an entry every LOOP packet, as does the InfluxDB
database. This can mean thousands of entries per hour.

The number of uploader entries can be drastically reduced by
using option `log_success`:

```ini
[StdRestful]
    ...
    [[WeeRT]]
        ...
        log_success = false
```

Consult the [InfluxDB configuration documentation](https://docs.influxdata.com/influxdb/v1.3/administration/config/)
for how to control its logging policies.

### Observation names

WeeRT uses a different system to name observation types than WeeWx.
For example, for outside temperature, WeeWX uses `outTemp`, while
WeeRT uses `outside_temperature`. The general pattern is that the last
part of the observation name, `temperature` in this example, denotes
the unit group. In WeeWX the unit group must be looked up in a table;
in WeeRT it can be inferred from the name.

Which brings us to the next topic...

### Units

Internally, WeeRT makes no assumptions about units. However, the
browser client does. Right now, it assumes all units are US
Customary. If they are in something else, you'll have to change the
HTML.

Eventually, WeeRT will be able to determine the proper unit label to
use from an observation's inferred unit group and from the type
`unit_system` (similar to WeeWX's `usUnits`).

### Security

The server requires authentication for any mutating actions, that is,
any POSTs or DELETEs. The default configuration (file
`server/config/config.js`) includes a user `weert` with password
`weert`. These should, obviously, be changed.

The configuration for the WeeWX uploader in `weewx.conf` should be
changed to match the chosen username and password.

# Data model

## Background

It is strongly recommended that you read the ["key
concepts"](https://docs.influxdata.com/influxdb/v1.3/concepts/key_concepts/)
section of the InfluxDB documentation. In particular, be sure to
understand the concepts of measurements, tags, and fields. These terms
are used throughout WeeRT.

## WeeRT and InfluxDB

WeeRT stores incoming real-time packets into measurement
`wxpackets`. These are then aggregated and subsampled regularly
(typically, every 5 minutes) into another measurement, `wxrecords`.

Data in `wxpackets` use a 24 hour retention policy --- they are purged
if older than 24 hours.  Data in `wxrecords` are retained
indefinitely.

### Schema

InfluxDB does not use a schema. Nevertheless, data is organized in a
structured, organized way.  Both `wxpackets` and `wxrecords` use
identical structures.

WeeRT uses two InfluxDB *tags*: `platform` and `stream`. The former,
`platform`, is intended to represent a physical presence, such as a
house, car, or piece of industrial machinery.  The latter, `stream`,
represents a data stream within the platform, such as a specific
weather station, or sensor. Like any InfluxDB tags, `platform` and
`stream` are indexed. The default `platform` is `default_platform`;
the default `stream` is `default_stream`.

The observation values, such as `outside_temperature`, are stored as
InfluxDB *fields*.  They are not indexed. Because InfluxDB does not
use a schema, new data types can be introduced into the data stream at
any time and they will be stored in the database.

The observation time is stored as field `time`, always in nanoseconds.

## Packets

There are several different ways of representing packet data in the WeeRT / Influx
ecosystem. It's useful to be aware of the differences.

- A __weewx-style packet__. This is the simple, flat data structure
  that weewx uses. It holds time (in integer seconds), field data, and the
  unit system used by the data, but no information about platforms or
  streams. It looks like:
  
   ```json
   {
     "dateTime" : 1507432417,
     "outTemp" : 20.5,
     "outHumidity" : 65.0,
     "usUnits" : 16
    }
    ```

- What we are calling a __deep packet__. This is a structured packet
  that the Node client library
  [node-influx](https://node-influx.github.io/) expects (as do the
  InfluxDB client libraries for most other languages). It is useful
  because the InfluxDB "measurement" and "tags" are explicitly
  represented. Time is in field `time` and it is in *nanoseconds*. It
  looks something like this:
 
   ```json
   {
     "timestamp" : 1507432417000000000,
     "measurement" : "wxpackets"
     "tags" : {"platform" : "Red barn", "stream" : "Accurite"}
     "fields" : {"outside_temperature" : 20.5, "outside_humidity" : 65.0, "unit_system" : 16}
    }
  ```
    
- What we are calling a __flattened packet__. This is what is returned from the
  [`query`](https://node-influx.github.io/class/src/index.js~InfluxDB.html#instance-method-query)
  function of node-influx. Unfortunately, it is slightly different
  from a deep packet. The tag members have been flattened in with the
  field data, and the time is now in field `time`:
  
   ```json
   {
     "time" : 1507432417000000000,
     "measurement" : "wxpackets",
     "platform" : "Red barn",
     "stream" : "Accurite",
     "outside_temperature" : 20.5,
     "outside_humidity" : 65.0,
     "unit_system" : 16
    }
   ```
    
- The InfluxDB [__line
  protocol__](https://docs.influxdata.com/influxdb/v1.2/write_protocols/line_protocol_reference/).
  This protocol is designed for on-the-wire efficiency. It is not
  explicitly used within WeeRT. It looks something like this:
 
   ```
   wxpackets,platform="Red barn",stream="Accurite" outside_temperature=20.5,outside_humidity=65.0,unit_system=16 1507432417000000000
   ```

WeeRT tries to consistently traffic in "deep packets," and does any conversions
that might be necessary. Both incoming and outgoing data use this format.
 
# <a name="API"></a>API

[//]: # (# The following commands will set up the database)
[//]: # (curl -XPOST 'http://localhost:8086/query?db=weert' --data-urlencode 'q=DROP MEASUREMENT "examples"')
[//]: # (curl -XPOST "http://localhost:8086/write?db=weert" --data-binary 'examples,platform=chevy,stream=oil temperature=177,pressure=27.9 1506713140000000000')
[//]: # (curl -XPOST "http://localhost:8086/write?db=weert" --data-binary 'examples,platform=chevy,stream=oil temperature=181,pressure=27.8 1506713200000000000')
[//]: # (curl -XPOST "http://localhost:8086/write?db=weert" --data-binary 'examples,platform=chevy,stream=oil temperature=182,pressure=27.6 1506713260000000000')
[//]: # (curl -XPOST "http://localhost:8086/write?db=weert" --data-binary 'examples,platform=chevy,stream=oil temperature=184,pressure=27.1 1506713320000000000')
[//]: # (curl -XPOST "http://localhost:8086/write?db=weert" --data-binary 'examples,platform=truck,stream=oil temperature=202,pressure=30.9 1506713140000000000')
[//]: # (curl -XPOST "http://localhost:8086/write?db=weert" --data-binary 'examples,platform=truck,stream=oil temperature=204,pressure=31.2 1506713200000000000')
[//]: # (curl -XPOST "http://localhost:8086/write?db=weert" --data-binary 'examples,platform=truck,stream=oil temperature=207,pressure=31.3 1506713260000000000')
[//]: # (curl -XPOST "http://localhost:8086/write?db=weert" --data-binary 'examples,platform=truck,stream=oil temperature=209,pressure=31.3 1506713320000000000')


All mutating calls (POSTs and DELETEs) must be authorized through
an `Authorization` header. It should include
the word `Basic`, followed by the base64 encoding of the username and password
with a colon in between. In Python, this looks like:

```python
import urllib2, base64

...
request = urllib2.Request(url)
base64string = base64.b64encode('%s:%s' % ('johndoe', 'mysecretpassword'))
request.add_header("Authorization", "Basic %s" % base64string)

```

Using `curl`, this can be done by adding the `-u` option, which is done in
the mutating examples below.
 

## Get packets

Return all packets from a series that satisfy a search query.

```
GET /api/v1/measurements/:measurement/packets
```

**Parameters**

| *Name*          | *Type*  | *Description*                                                                                                                    |
|:----------------|:--------|:--------------------------------------------------------------------------------------------------------------------|
| `platform`      | string  | Include only packets from platform `platform`.                                                                      |
| `stream`        | string  | Include only packets from stream `stream`.                                                                          |
| `start`         | integer | All packets greater than this timestamp will be included in the results. Default: first available packet.           |
| `stop`          | integer | All packets less than or equal to this timestamp will be included in the results. Default: last available packet.   |
| `limit`         | integer | Limit the number of returned packets to this value. Default: no limit.                                              |
| `direction`     | string  | The direction of the sort. Can be either `asc` or `desc`. Default: `asc`.                                           |


**Response code**

| *Status* | *Meaning*             |
|:---------|:----------------------|
| 200      | Success               |
| 400      | Malformed query       |

**Examples**

Ask for all the packets in the measurement `examples`. This is the entire example database.

```shell
$ curl -i --silent -X GET 'http://localhost:3000/api/v1/measurements/examples/packets'

HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 977
ETag: W/"3d1-z8xpd0zpO32IV/wmH/q6HDQGaH0"
Vary: Accept-Encoding
Date: Tue, 24 Oct 2017 00:55:37 GMT
Connection: keep-alive

[
    {
        "fields": {
            "pressure": 27.9,
            "temperature": 177
        },
        "tags": {
            "platform": "chevy",
            "stream": "oil"
        },
        "timestamp": 1506713140000000000
    },
    {
        "fields": {
            "pressure": 30.9,
            "temperature": 202
        },
        "tags": {
            "platform": "truck",
            "stream": "oil"
        },
        "timestamp": 1506713140000000000
    },
    {
        "fields": {
            "pressure": 27.8,
            "temperature": 181
        },
        "tags": {
            "platform": "chevy",
            "stream": "oil"
        },
        "timestamp": 1506713200000000000
    },
    {
        "fields": {
            "pressure": 31.2,
            "temperature": 204
        },
        "tags": {
            "platform": "truck",
            "stream": "oil"
        },
        "timestamp": 1506713200000000000
    },
    {
        "fields": {
            "pressure": 27.6,
            "temperature": 182
        },
        "tags": {
            "platform": "chevy",
            "stream": "oil"
        },
        "timestamp": 1506713260000000000
    },
    {
        "fields": {
            "pressure": 31.3,
            "temperature": 207
        },
        "tags": {
            "platform": "truck",
            "stream": "oil"
        },
        "timestamp": 1506713260000000000
    },
    {
        "fields": {
            "pressure": 27.1,
            "temperature": 184
        },
        "tags": {
            "platform": "chevy",
            "stream": "oil"
        },
        "timestamp": 1506713320000000000
    },
    {
        "fields": {
            "pressure": 31.3,
            "temperature": 209
        },
        "tags": {
            "platform": "truck",
            "stream": "oil"
        },
        "timestamp": 1506713320000000000
    }
]

```

Query again, but this time ask for only those packets on platform `truck`, and limit it
to 2 packets:

```shell
$ curl -i --silent -X GET 'http://localhost:3000/api/v1/measurements/examples/packets?platform=truck&limit=2'

HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 245
ETag: W/"f5-G5Yauk5W7LXG63YkJb0or/uI8Xk"
Vary: Accept-Encoding
Date: Tue, 24 Oct 2017 00:55:37 GMT
Connection: keep-alive

[
    {
        "fields": {
            "pressure": 30.9,
            "temperature": 202
        },
        "tags": {
            "platform": "truck",
            "stream": "oil"
        },
        "timestamp": 1506713140000000000
    },
    {
        "fields": {
            "pressure": 31.2,
            "temperature": 204
        },
        "tags": {
            "platform": "truck",
            "stream": "oil"
        },
        "timestamp": 1506713200000000000
    }
]

```

Query, constraining by time and platform name, returning results in reverse order:


```shell
$ curl -i -X GET 'http://localhost:3000/api/v1/measurements/examples/packets?start=1506713140000000000&stop=1506713260000000000&platform=chevy&direction=desc'

HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 245
ETag: W/"f5-EC7e/TCAszVF1VOaA6dqKGmcOnM"
Vary: Accept-Encoding
Date: Tue, 24 Oct 2017 00:55:37 GMT
Connection: keep-alive

[
    {
        "fields": {
            "pressure": 27.6,
            "temperature": 182
        },
        "tags": {
            "platform": "chevy",
            "stream": "oil"
        },
        "timestamp": 1506713260000000000
    },
    {
        "fields": {
            "pressure": 27.8,
            "temperature": 181
        },
        "tags": {
            "platform": "chevy",
            "stream": "oil"
        },
        "timestamp": 1506713200000000000
    }
]

```

## Get a specific timestamp

Return packets with a specific timestamp.


```
GET /api/v1/measurements/:measurement/packets/:timestamp
```

**Parameters**

| *Name*          | *Type*  | *Description*                                   |
|:----------------|:--------|:------------------------------------------------|
| `platform` | string  | Include only packets on the platform `platform`.     |
| `stream`   | string  | Include only packets on the stream `stream`.         |

**Response code**

| *Status* | *Meaning*                  |
|:---------|:---------------------------|
| 200      | Success                    |
| 400      | Malformed query            |
| 404      | Measurement does not exist |

**Example**

Get all packets at timestamp `1506713200000000000` on the platform `truck`.

```shell
$ curl -i -X GET 'http://localhost:3000/api/v1/measurements/examples/packets/1506713200000000000?platform=truck'

HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 121
ETag: W/"79-6iBKrKP1W3M71u2HonnjN59/2zs"
Vary: Accept-Encoding
Date: Tue, 24 Oct 2017 00:55:37 GMT
Connection: keep-alive

{
    "fields": {
        "pressure": 31.2,
        "temperature": 204
    },
    "tags": {
        "platform": "truck",
        "stream": "oil"
    },
    "timestamp": 1506713200000000000
}

```


## Post a new packet

Post a new packet.

```
POST /api/v1/measurements/:measurement/packets
```

**Header**

The HTTP request must include an `Authorization` header.

**JSON input**

A deep packet must be included in the body of the request.

The packet need not include a value for `measurement`, but, if included,
it must match the value given in the URL.

The packet must include a value for `timestamp`.

Any fields with a `null` value will be ignored and not inserted into the
database.

**Response code**

| *Status* | *Meaning*                         |
|:---------|:----------------------------------|
| 201      | Created                           |
| 400      | Malformed post                    |
| 415      | Invalid or missing `Content-type` |

If successful, the server will return a response code of 201, with the
response `Location` field set to the URL of the newly created resource (packet).

**Example**

Add a new packet for the platform `truck` and stream `oil`.

```shell
$ curl -u weert:weert -i --silent -X POST -H Content-type:application/json -d  \
>   '{"timestamp" : 1506713320000000000, \
>   "tags" : {"platform":"truck", "stream":"oil"}, \
>   "fields" : {"temperature":209, "pressure": 31.4}} ' \
>   http://localhost:3000/api/v1/measurements/examples/packets

HTTP/1.1 201 Created
X-Powered-By: Express
Location: http://localhost:3000/api/v1/measurements/examples/packets/1506713320000000000
Content-Type: text/plain; charset=utf-8
Content-Length: 7
ETag: W/"7-rM9AyJuqT6iOan/xHh+AW+7K/T8"
Vary: Accept-Encoding
Date: Tue, 24 Oct 2017 00:55:37 GMT
Connection: keep-alive

Created
```

Note how the URL of the new resource is returned in the header `Location`.


## Delete a specific timestamp

Delete packets with a specific timestamp.


```
DELETE /api/v1/measurements/:measurement/packets/:timestamp
```

**Header**

The HTTP request must include an `Authorization` header.

**Parameters**

| *Name*     | *Type*  | *Description*                                                                                 |
|:-----------|:--------|:----------------------------------------------------------------------------------------------|
| `platform` | string  | Delete only packets on the platform `platform`.                                               |
| `stream`   | string  | Delete only packets on the stream `stream`.                                                   |

**Response code**

| *Status* | *Meaning*             |
|:---------|:----------------------|
| 204      | Success               |

The same response code (204) is returned irregardless of whether or not any packet fitting the criteria
actually existed in the database.

**Example**

Delete all packets with timestamp `1506713320000000000`.

```shell
$ curl -u weert:weert -i --silent -X DELETE http://localhost:3000/api/v1/measurements/examples/packets/1506713320000000000

HTTP/1.1 204 No Content
X-Powered-By: Express
ETag: W/"a-bAsFyilMr4Ra1hIU5PyoyFRunpI"
Date: Tue, 24 Oct 2017 00:55:37 GMT
Connection: keep-alive

```


## Get information about a measurement.

Query the database for information about an InfluxDB measurement.

```
GET /api/v1/measurements/:measurement
```


**Return status**

| *Status* | *Meaning*             |
|:---------|:----------------------|
| 200      | Success               |
| 404      | Measurement not found |

If successful, the server will return an array whose elements are the series
in measurement `measurement`.

**Examples**

Get information about the measurement `examples`.

```Shell
$ curl -i --silent -X GET 'http://localhost:3000/api/v1/measurements/examples'

HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 91
ETag: W/"5b-vPUmWz8f/FSc+swPafrd2Z2eiKk"
Vary: Accept-Encoding
Date: Tue, 24 Oct 2017 00:55:37 GMT
Connection: keep-alive

[
    {
        "key": "examples,platform=chevy,stream=oil"
    },
    {
        "key": "examples,platform=truck,stream=oil"
    }
]

```

Do the example again, but using a bogus measurement name. It returns
a 404 "Not Found" status code.

```shell
$ curl -i --silent -X GET http://localhost:3000/api/v1/measurements/foo

HTTP/1.1 404 Not Found
X-Powered-By: Express
Content-Type: text/plain; charset=utf-8
Content-Length: 9
ETag: W/"9-0gXL1ngzMqISxa6S1zx3F4wtLyg"
Vary: Accept-Encoding
Date: Tue, 24 Oct 2017 00:55:37 GMT
Connection: keep-alive

Not Found
```

## Delete a measurement

Delete a measurement from the InfluxDB database.

```
DELETE ap/v1/measurements/:measurement
```

**Header**

The HTTP request must include an `Authorization` header.

**Return status**

| *Status* | *Meaning*             |
|:---------|:----------------------|
| 204      | Success / NO CONTENT  |
| 404      | Measurement not found |

**Examples**

Delete the measurement `examples`. All packets within the measurement will be deleted.

```shell
$ curl -u weert:weert -i --silent -X DELETE 'http://localhost:3000/api/v1/measurements/examples'

HTTP/1.1 204 No Content
X-Powered-By: Express
ETag: W/"a-bAsFyilMr4Ra1hIU5PyoyFRunpI"
Date: Tue, 24 Oct 2017 00:55:38 GMT
Connection: keep-alive

```


Do the example again, but using a bogus measurement name. It should
return the same status code, 204.

```shell
$ curl -u weert:weert -i --silent -X DELETE 'http://localhost:3000/api/v1/measurements/foo'

HTTP/1.1 204 No Content
X-Powered-By: Express
ETag: W/"a-bAsFyilMr4Ra1hIU5PyoyFRunpI"
Date: Tue, 24 Oct 2017 00:55:38 GMT
Connection: keep-alive

```




# License & Copyright

Copyright (c) 2015-2017 Tom Keffer <tkeffer@gmail.com>

  See the file LICENSE for your full rights.
