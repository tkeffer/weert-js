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

1. Make sure you are running WeeWX V3.8 or later. Earlier versions do not support the POST method used
by the uploader.

2. Add the following to `weewx.conf`:

    ```ini
    [StdRestful]
        ...
        [[WeeRT]]
            host = localhost
            port = 3000

    ...

    [Engine]
        [[Services]]
            ...
            restful_services = ..., weert.WeeRT

    ```

3. Make sure the `weert.py` module is in your `PYTHONPATH`.

4. Run `weewxd`

5. Open up a client at [http://localhost:3000/index.html](http://localhost:3000/index.html).


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

Eventually, WeeRT will be able to determine the proper unit label to use from an
observation's inferred unit group and from the type `unit_system`
(similar to WeeWX's `usUnits`).

# Data model

## Background

It is strongly recommended that you read the ["key concepts"
section](https://docs.influxdata.com/influxdb/v1.3/concepts/key_concepts/)
of the InfluxDB documentation. In particular, be sure to understand
the concepts of measurements, tags, and fields. These terms are used
throughout WeeRT.

## Packets

There are several different ways of representing packet data in the WeeRT / Influx
ecosystem. It's useful to be aware of the differences.

- A __weewx-style packet__. This is the simple, flat data structure that weewx uses. 
  It holds time (in seconds), field data, and the unit system used by the data, 
  but no information about platforms or streams. It looks like:
  
   ```json
   {
     "dateTime" : 1507432417,
     "temperature" : 108.3, 
     "rpm" : 1850, 
     "unit_system" : 16
    }
    ```

- What we are calling a __deep packet__. This is a structured packet that the Node
  client library [node-influx](https://node-influx.github.io/) expects 
  (as do the InfluxDB client libraries for most other languages). It is useful
  because the InfluxDB "measurement" and "tags" are explicitly represented. Time is 
  in field `time` and it is in *nanoseconds*. It looks something like this:
 
   ```json
   {
     "time" : 1507432417000000000,
     "measurement" : "highway_data"
     "tags" : {"platform" : "Red chevy", "stream" : "engine_parameters"}
     "fields" : {"temperature" : 108.3, "rpm" : 1850, "unit_system" : 16}
    }
  ```
    
- What we are calling a __flattened packet__. This is what is returned from
  the [`query`](https://node-influx.github.io/class/src/index.js~InfluxDB.html#instance-method-query)
  function of node-influx. Unfortunately, it is slightly different from a deep packet. The tag
  members have been flattened in with the field data:
  
   ```json
   {
     "time" : 1507432417000000000,
     "platform" : "Red chevy",
     "stream" : "engine_parameters",
     "temperature" : 108.3, 
     "rpm" : 1850, 
     "unit_system" : 16
    }
   ```
    
- The InfluxDB [__line protocol__](https://docs.influxdata.com/influxdb/v1.2/write_protocols/line_protocol_reference/).
  This protocol is designed for on-the-wire efficiency. It is not explicitly used within WeeRT. It looks something like this:
 
   ~~~
   highway_data, platform="Red chevy",stream="engine_parameters" temperature=108.3,rpm=1850 1507432417000000000
   ~~~

WeeRT tries to consistently traffic in "deep packets." Data going in and out of the WeeRT server
are in this format. 
 
# <a name="API"></api>API

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
Content-Length: 993
ETag: W/"3e1-jwaqdm8V1DWmEkSqaU2pW8b7QkI"
Date: Sat, 30 Sep 2017 18:44:48 GMT
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
Content-Length: 249
ETag: W/"f9-f2fSFZh9IkaIFnn6m/ZtH32aznQ"
Date: Sat, 30 Sep 2017 18:44:48 GMT
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
Content-Length: 249
ETag: W/"f9-24gaPxQBiCT4du1TnHz0Z12Z9ME"
Date: Sat, 30 Sep 2017 18:44:48 GMT
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
Content-Length: 123
ETag: W/"7b-hB0MTLw6Mo2NOw1g6UNRhDfnu1o"
Date: Sat, 30 Sep 2017 18:44:48 GMT
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
$ curl -i --silent -X POST -H Content-type:application/json -d  \
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
Date: Sat, 30 Sep 2017 18:44:48 GMT
Connection: keep-alive

Created
```

Note how the URL of the new resource is returned in the header `Location`.


## Delete a specific timestamp

Delete packets with a specific timestamp.


```
DELETE /api/v1/measurements/:measurement/packets/:timestamp
```

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
$ curl -i --silent -X DELETE http://localhost:3000/api/v1/measurements/examples/packets/1506713320000000000

HTTP/1.1 204 No Content
X-Powered-By: Express
ETag: W/"a-bAsFyilMr4Ra1hIU5PyoyFRunpI"
Date: Sat, 30 Sep 2017 18:44:48 GMT
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
Date: Sat, 30 Sep 2017 18:44:48 GMT
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
Date: Sat, 30 Sep 2017 18:44:48 GMT
Connection: keep-alive

Not Found
```

## Delete a measurement

Delete a measurement from the InfluxDB database.

```
DELETE ap/v1/measurements/:measurement
```

**Return status**

| *Status* | *Meaning*             |
|:---------|:----------------------|
| 204      | Success / NO CONTENT  |
| 404      | Measurement not found |

**Examples**

Delete the measurement `examples`. All packets within the measurement will be deleted.

```shell
$ curl -i --silent -X DELETE 'http://localhost:3000/api/v1/measurements/examples'

HTTP/1.1 204 No Content
X-Powered-By: Express
ETag: W/"a-bAsFyilMr4Ra1hIU5PyoyFRunpI"
Date: Sat, 30 Sep 2017 18:44:48 GMT
Connection: keep-alive

```


Do the example again, but using a bogus measurement name. It should
return the same status code, 204.

```shell
$ curl -i --silent -X DELETE 'http://localhost:3000/api/v1/measurements/foo'

HTTP/1.1 204 No Content
X-Powered-By: Express
ETag: W/"a-bAsFyilMr4Ra1hIU5PyoyFRunpI"
Date: Sat, 30 Sep 2017 18:44:48 GMT
Connection: keep-alive

```




# License & Copyright

Copyright (c) 2015-2017 Tom Keffer <tkeffer@gmail.com>

  See the file LICENSE for your full rights.
