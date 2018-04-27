# WeeRT

[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

WeeRT consists of two, independent parts:
- A real-time logging and display server, written with [Node](https://nodejs.org/en/),
[Express](http://expressjs.com/), and [InfluxDB](https://www.influxdata.com/).
- A client, written with [React](https://reactjs.org/) and [Redux](https://redux.js.org/),
that interacts with the server.

This utility is still EXPERIMENTAL, and will require some skill to install and administer.

The server and client use separate install and build procedures.

## Installing the server

1. Download and install [InfluxDB](https://www.influxdata.com/). WeeRT was tested with
version 1.3.5. Later versions should work fine.

2. If necessary, start it by whatever means is needed for your operating system. This works
on Ubuntu 16.04:

  ```shell
  $ systemctl start influxdb
  ```

3. Download and install [node](https://nodejs.org/en/). WeeRT was tested with version 8.9.0,
also known as LTS/Carbon. This version or later is needed to support the object "spread" operator
used by WeeRT. Later versions should work fine.

4. Download WeeRT from the git repository

  ```shell
  $ git clone https://github.com/tkeffer/weert-js.git
  ```

5. Enter the directory, and install the server dependencies

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

## Building and running the client

1. Install, then build the client libraries.

    ```shell
    cd client
   npm install
   npm run build
    ```

2. After making sure the WeeRT server is still running, open up a client at [http://localhost:3000](http://localhost:3000).


## General architecture
- Uses a [Node](https://nodejs.org/) server with the [Express framework](http://expressjs.com/).
- The server offers a RESTful API ([described below](#API)) for storing, retrieving,
  and deleting data measurements.
- Data are stored in a [InfluxDB](https://www.influxdata.com/) server.
- Realtime updates are done through a publish - subscribe interface
  using [Socket.io](https://socket.io).
- The client asks for the necessary data through the API, then subscribes to any updates.
- The client view is managed by React.
- The client data state is managed by Redux.
- Realtime plots are done using [Recharts](http://recharts.org). This is a charting library that uses
  React to create DOM elements. As of 15-Feb-2018 it is still in beta, but seems reasonably stable.

## Notes

### Pub-sub

When new LOOP packets come into WeeRT through the POST interface, they
are published using Faye. Interested clients can subscribe to these
publications.

### Subsampling

Every 5 minutes (configurable), the WeeRT server subsamples the raw, loop, data,
converting it into evenly spaced records. See file `config/ss_policies.js` for the subsampling
policies. By default, it is run every 5 minutes, uses measurement 'wxpackets' for its source,
and measurement 'wxrecords' as its destination.

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
WeeRT uses `out_temperature`. The general pattern is that the last
part of the observation name, `temperature` in this example, denotes
the unit group. In WeeWX the unit group must be looked up in a table;
in WeeRT it can be inferred from the name.

Which brings us to the next topic...

### Units

Internally, the WeeRT server makes no assumptions about units.

The client is unit-agnostic, except for the WindCompass, which assumes US
Customary.

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

The observation values, such as `out_temperature`, are stored as
InfluxDB *fields*.  They are not indexed. Because InfluxDB does not
use a schema, new data types can be introduced into the data stream at
any time and they will be stored in the database.

The observation time is stored as field `time` in the database.

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
  represented. Time is in field `time` and it is in *milliseconds*. It
  looks something like this:
 
   ```json
   {
     "timestamp" : 1507432417000,
     "measurement" : "wxpackets"
     "tags" : {"platform" : "Red barn", "stream" : "Accurite"}
     "fields" : {"out_temperature" : 20.5, "out_humidity_percent" : 65.0, "unit_system" : 16}
    }
  ```
    
- What we are calling a __flattened packet__. This is what is returned from the
  [`query`](https://node-influx.github.io/class/src/index.js~InfluxDB.html#instance-method-query)
  function of node-influx. Unfortunately, it is slightly different
  from a deep packet. The tag members have been flattened in with the
  field data, and the time is now in field `time`:
  
   ```json
   {
     "time" : 1507432417000,
     "measurement" : "wxpackets",
     "platform" : "Red barn",
     "stream" : "Accurite",
     "out_temperature" : 20.5,
     "out_humidity_percent" : 65.0,
     "unit_system" : 16
    }
   ```
    
- The InfluxDB [__line
  protocol__](https://docs.influxdata.com/influxdb/v1.2/write_protocols/line_protocol_reference/).
  This protocol is designed for on-the-wire efficiency. It is not
  explicitly used within WeeRT. It looks something like this:
 
   ```
   wxpackets,platform="Red barn",stream="Accurite" out_temperature=20.5,out_humidity_percent=65.0,unit_system=16 1507432417000000000
   ```

WeeRT tries to consistently traffic in "deep packets," and does any conversions
that might be necessary. Both incoming and outgoing data use this format.
 
# <a name="API"></a>API

[//]: # (# The following commands will set up the database)
[//]: # (curl -XPOST 'http://localhost:8086/query?db=weert' --data-urlencode 'q=DROP MEASUREMENT "examples"')
[//]: # (curl -XPOST "http://localhost:8086/write?db=weert" --data-binary 'examples,platform=barn,stream=accurite unit_system=1,out_temperature=55.2,sealevel_pressure=29.812 1506713140000000000')
[//]: # (curl -XPOST "http://localhost:8086/write?db=weert" --data-binary 'examples,platform=barn,stream=accurite unit_system=1,out_temperature=55.3,sealevel_pressure=29.839 1506713200000000000')
[//]: # (curl -XPOST "http://localhost:8086/write?db=weert" --data-binary 'examples,platform=barn,stream=accurite unit_system=1,out_temperature=55.5,sealevel_pressure=29.840 1506713260000000000')
[//]: # (curl -XPOST "http://localhost:8086/write?db=weert" --data-binary 'examples,platform=barn,stream=accurite unit_system=1,out_temperature=55.6,sealevel_pressure=29.838 1506713320000000000')
[//]: # (curl -XPOST "http://localhost:8086/write?db=weert" --data-binary 'examples,platform=barn,stream=loft unit_system=1,out_temperature=61.2,sealevel_pressure=29.881 1506713140000000000')
[//]: # (curl -XPOST "http://localhost:8086/write?db=weert" --data-binary 'examples,platform=barn,stream=loft unit_system=1,out_temperature=61.3,sealevel_pressure=29.901 1506713200000000000')
[//]: # (curl -XPOST "http://localhost:8086/write?db=weert" --data-binary 'examples,platform=barn,stream=loft unit_system=1,out_temperature=61.6,sealevel_pressure=29.908 1506713260000000000')
[//]: # (curl -XPOST "http://localhost:8086/write?db=weert" --data-binary 'examples,platform=barn,stream=loft unit_system=1,out_temperature=61.6,sealevel_pressure=29.910 1506713320000000000')








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

| *Name*          | *Type*  | *Description*                                                                                                       |
|:----------------|:--------|:--------------------------------------------------------------------------------------------------------------------|
| `platform`      | string  | Include only packets from platform `platform`.                                                                      |
| `stream`        | string  | Include only packets from stream `stream`.                                                                          |
| `start`         | integer | All packets greater than this timestamp in milliseconds will be included in the results. Default: first available packet.          |
| `stop`          | integer | All packets less than or equal to this timestamp in milliseconds will be included in the results. Default: last available packet.  |
| `limit`         | integer | Limit the number of returned packets to this value. Default: no limit.                                              |
| `direction`     | string  | The direction of the sort. Can be either `asc` or `desc`. Default: `asc`.                                           |
| `group`         | string  | Group by time (*e.g.* '1h''). This will perform a server-defined aggregation for each observation type.             |


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
Content-Length: 1199
ETag: W/"4af-L0UIsq5sC4PTfrENfRMN2W/ZRN4"
Vary: Accept-Encoding
Date: Sat, 10 Mar 2018 22:53:29 GMT
Connection: keep-alive

[
    {
        "fields": {
            "out_temperature": 55.2,
            "sealevel_pressure": 29.812,
            "unit_system": 1
        },
        "tags": {
            "platform": "barn",
            "stream": "accurite"
        },
        "timestamp": 1506713140000
    },
    {
        "fields": {
            "out_temperature": 61.2,
            "sealevel_pressure": 29.881,
            "unit_system": 1
        },
        "tags": {
            "platform": "barn",
            "stream": "loft"
        },
        "timestamp": 1506713140000
    },
    {
        "fields": {
            "out_temperature": 55.3,
            "sealevel_pressure": 29.839,
            "unit_system": 1
        },
        "tags": {
            "platform": "barn",
            "stream": "accurite"
        },
        "timestamp": 1506713200000
    },
    {
        "fields": {
            "out_temperature": 61.3,
            "sealevel_pressure": 29.901,
            "unit_system": 1
        },
        "tags": {
            "platform": "barn",
            "stream": "loft"
        },
        "timestamp": 1506713200000
    },
    {
        "fields": {
            "out_temperature": 55.5,
            "sealevel_pressure": 29.84,
            "unit_system": 1
        },
        "tags": {
            "platform": "barn",
            "stream": "accurite"
        },
        "timestamp": 1506713260000
    },
    {
        "fields": {
            "out_temperature": 61.6,
            "sealevel_pressure": 29.908,
            "unit_system": 1
        },
        "tags": {
            "platform": "barn",
            "stream": "loft"
        },
        "timestamp": 1506713260000
    },
    {
        "fields": {
            "out_temperature": 55.6,
            "sealevel_pressure": 29.838,
            "unit_system": 1
        },
        "tags": {
            "platform": "barn",
            "stream": "accurite"
        },
        "timestamp": 1506713320000
    },
    {
        "fields": {
            "out_temperature": 61.6,
            "sealevel_pressure": 29.91,
            "unit_system": 1
        },
        "tags": {
            "platform": "barn",
            "stream": "loft"
        },
        "timestamp": 1506713320000
    }
]

```

Query again, but this time ask for only those packets on stream `loft`, and limit it
to 2 packets:

```shell
$ curl -i --silent -X GET 'http://localhost:3000/api/v1/measurements/examples/packets?stream=loft&limit=2'

HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 297
ETag: W/"129-idTpnNGWyDv2HF/iWVXjfjypa6c"
Vary: Accept-Encoding
Date: Sat, 10 Mar 2018 22:53:29 GMT
Connection: keep-alive

[
    {
        "fields": {
            "out_temperature": 61.2,
            "sealevel_pressure": 29.881,
            "unit_system": 1
        },
        "tags": {
            "platform": "barn",
            "stream": "loft"
        },
        "timestamp": 1506713140000
    },
    {
        "fields": {
            "out_temperature": 61.3,
            "sealevel_pressure": 29.901,
            "unit_system": 1
        },
        "tags": {
            "platform": "barn",
            "stream": "loft"
        },
        "timestamp": 1506713200000
    }
]

```

Query, constraining by time and stream name, returning results in reverse order:


```shell
$ curl -i -X GET 'http://localhost:3000/api/v1/measurements/examples/packets?start=1506713140000&stop=1506713260000&stream=loft&direction=desc'

HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 297
ETag: W/"129-7ngYWuleRY7fPIgWhooZwkCBK0w"
Vary: Accept-Encoding
Date: Sat, 10 Mar 2018 22:53:29 GMT
Connection: keep-alive

[
    {
        "fields": {
            "out_temperature": 61.6,
            "sealevel_pressure": 29.908,
            "unit_system": 1
        },
        "tags": {
            "platform": "barn",
            "stream": "loft"
        },
        "timestamp": 1506713260000
    },
    {
        "fields": {
            "out_temperature": 61.3,
            "sealevel_pressure": 29.901,
            "unit_system": 1
        },
        "tags": {
            "platform": "barn",
            "stream": "loft"
        },
        "timestamp": 1506713200000
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

Get all packets at timestamp `1506713200000` on the stream `accurite`.

```shell
$ curl -i -X GET 'http://localhost:3000/api/v1/measurements/examples/packets/1506713200000?stream=accurite'

HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 153
ETag: W/"99-J5xEyWItQGPLhwz5OEdZrKYl/HU"
Vary: Accept-Encoding
Date: Sat, 10 Mar 2018 22:53:29 GMT
Connection: keep-alive

[
    {
        "fields": {
            "out_temperature": 55.3,
            "sealevel_pressure": 29.839,
            "unit_system": 1
        },
        "tags": {
            "platform": "barn",
            "stream": "accurite"
        },
        "timestamp": 1506713200000
    }
]

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

The packet must include a value for `timestamp` in milliseconds.

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

Add a new packet for the platform `barn` and stream `accurite`.

```shell
$ curl -u weert:weert -i --silent -X POST -H Content-type:application/json -d  \
>   '{"timestamp" : 1506713320000, \
>   "tags" : {"platform":"barn", "stream":"accurite"}, \
>   "fields" : {"unit_system":1, "out_temperature":56.1, "sealevel_pressure": 29.881}} ' \
>   http://localhost:3000/api/v1/measurements/examples/packets

HTTP/1.1 201 Created
X-Powered-By: Express
Location: http://localhost:3000/api/v1/measurements/examples/packets/1506713320000
Content-Type: text/plain; charset=utf-8
Content-Length: 7
ETag: W/"7-rM9AyJuqT6iOan/xHh+AW+7K/T8"
Vary: Accept-Encoding
Date: Sat, 10 Mar 2018 22:53:29 GMT
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

Delete all packets with timestamp `1506713320000`.

```shell
$ curl -u weert:weert -i --silent -X DELETE http://localhost:3000/api/v1/measurements/examples/packets/1506713320000

HTTP/1.1 204 No Content
X-Powered-By: Express
ETag: W/"a-bAsFyilMr4Ra1hIU5PyoyFRunpI"
Date: Sat, 10 Mar 2018 22:53:29 GMT
Connection: keep-alive

```


## Get meta-information about a measurement.

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
Content-Length: 77
ETag: W/"4d-1amwyw0DG1fpJrxME60jbdepTSc"
Vary: Accept-Encoding
Date: Sat, 10 Mar 2018 22:53:29 GMT
Connection: keep-alive

[
    {
        "platform": "barn",
        "stream": "accurite"
    },
    {
        "platform": "barn",
        "stream": "loft"
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
Date: Sat, 10 Mar 2018 22:53:29 GMT
Connection: keep-alive

Not Found
```

## Get statistics

Return general statistics about a measurement

```
GET /api/v1/measurements/:measurement/stats
```

**Parameters**

| *Name*      | *Type*  | *Description*                                                                                     |
|:------------|:--------|:--------------------------------------------------------------------------------------------------|
| `platform`  | string  | Include only data from platform `platform`. Default is to include all platforms.                  |
| `stream`    | string  | Include only data from stream `stream`. Default is to include all streams.                        |
| `span`      | string  | Return statistics for the given time span. Choices are `day`,`week`, `month` or `year`. Required. |
| `now`       | integer | This variable is a time in nanoseconds somewhere in that `span`. Default is the present time.     |


**Response code**

| *Status* | *Meaning*             |
|:---------|:----------------------|
| 200      | Success               |
| 400      | Malformed query       |

**Example**

Get the statistics for the day surrounding the sample data. Note that only a handful of the returned
values are non-null. This is because statistics, unlike other queries, require a schema to specify not
only which types are to be returned, but also which aggregations are to be run against those types.

For the sample data, most of these types were not inserted into the database. Hence, their statistics are null.

See file `server/config/stats_policies.js` for the schema.

```shell
$ curl -i --silent -X GET 'http://localhost:3000/api/v1/measurements/examples/stats?span=day&now=1506713200000'

HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 1828
ETag: W/"724-nvlqRtRGm24tJxyFf+cb85k9IBI"
Vary: Accept-Encoding
Date: Sat, 10 Mar 2018 22:53:29 GMT
Connection: keep-alive

{
    "altimeter_pressure": {
        "max": {
            "timestamp": null,
            "value": null
        },
        "min": {
            "timestamp": null,
            "value": null
        }
    },
    "dewpoint_temperature": {
        "max": {
            "timestamp": null,
            "value": null
        },
        "min": {
            "timestamp": null,
            "value": null
        }
    },
    "extra1_humidity_percent": {
        "max": {
            "timestamp": null,
            "value": null
        },
        "min": {
            "timestamp": null,
            "value": null
        }
    },
    "extra1_temperature": {
        "max": {
            "timestamp": null,
            "value": null
        },
        "min": {
            "timestamp": null,
            "value": null
        }
    },
    "gauge_pressure": {
        "max": {
            "timestamp": null,
            "value": null
        },
        "min": {
            "timestamp": null,
            "value": null
        }
    },
    "heatindex_temperature": {
        "max": {
            "timestamp": null,
            "value": null
        },
        "min": {
            "timestamp": null,
            "value": null
        }
    },
    "in_humidity_percent": {
        "max": {
            "timestamp": null,
            "value": null
        },
        "min": {
            "timestamp": null,
            "value": null
        }
    },
    "in_temperature": {
        "max": {
            "timestamp": null,
            "value": null
        },
        "min": {
            "timestamp": null,
            "value": null
        }
    },
    "out_humidity_percent": {
        "max": {
            "timestamp": null,
            "value": null
        },
        "min": {
            "timestamp": null,
            "value": null
        }
    },
    "out_temperature": {
        "max": {
            "timestamp": 1506713260000,
            "value": 61.6
        },
        "min": {
            "timestamp": 1506713140000,
            "value": 55.2
        }
    },
    "radiation_radiation": {
        "max": {
            "timestamp": null,
            "value": null
        },
        "min": {
            "timestamp": null,
            "value": null
        }
    },
    "rain_rain": {
        "sum": {
            "value": null
        }
    },
    "sealevel_pressure": {
        "max": {
            "timestamp": 1506713260000,
            "value": 29.908
        },
        "min": {
            "timestamp": 1506713140000,
            "value": 29.812
        }
    },
    "unit_system": {
        "max": {
            "timestamp": 1506713140000,
            "value": 1
        },
        "min": {
            "timestamp": 1506713140000,
            "value": 1
        }
    },
    "uv_uv": {
        "max": {
            "timestamp": null,
            "value": null
        },
        "min": {
            "timestamp": null,
            "value": null
        }
    },
    "wind_speed": {
        "max": {
            "timestamp": null,
            "value": null
        },
        "min": {
            "timestamp": null,
            "value": null
        }
    },
    "windchill_temperature": {
        "max": {
            "timestamp": null,
            "value": null
        },
        "min": {
            "timestamp": null,
            "value": null
        }
    },
    "windgust_speed": {
        "max": {
            "timestamp": null,
            "value": null
        }
    },
    "x_wind_speed": {
        "count": {
            "value": null
        },
        "sum": {
            "value": null
        }
    },
    "y_wind_speed": {
        "count": {
            "value": null
        },
        "sum": {
            "value": null
        }
    }
}

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


**Examples**

Delete the measurement `examples`. All packets within the measurement will be deleted.

```shell
$ curl -u weert:weert -i --silent -X DELETE 'http://localhost:3000/api/v1/measurements/examples'

HTTP/1.1 204 No Content
X-Powered-By: Express
ETag: W/"a-bAsFyilMr4Ra1hIU5PyoyFRunpI"
Date: Sat, 10 Mar 2018 22:53:29 GMT
Connection: keep-alive

```


Do the example again, but using a bogus measurement name. It should
return the same status code, 204.

```shell
$ curl -u weert:weert -i --silent -X DELETE 'http://localhost:3000/api/v1/measurements/foo'

HTTP/1.1 204 No Content
X-Powered-By: Express
ETag: W/"a-bAsFyilMr4Ra1hIU5PyoyFRunpI"
Date: Sat, 10 Mar 2018 22:53:29 GMT
Connection: keep-alive

```



# License & Copyright

Copyright (c) 2015-2018 Tom Keffer <tkeffer@gmail.com>

  See the file LICENSE for your full rights.
