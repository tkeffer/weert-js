## Use cases

### Subsampling
  - Conversion of the raw, LOOP packets, into regular, archive records. Typically,
they are aggregated over 5 minutes or so.
  - A bunch of packets in, a single record out.
  - Subsampling scheme should not be _ad hoc_, but is more like a schema.
  - A single type may appear as input multiple times, but the output types must be unique.
  - Don't care about the *time* a min, max, or last value occurs.

### Group by
  - Typical use case is plotting observations, aggregated by time.
  - Input is an ordered array of observations, the output is an ordered array of observations,
  grouped by the aggregating time. Vector in, vector out.
  - Likely to be very _ad hoc_ and specified by an end user for a plot.
  - The same type may appear as input multiple times. For example, user may want to plot both max and average
  `out_temperature`. Output types are unnamed.
  - Don't care about the *time* a min, max, or last value occurs.

### Statistics
  - Things like min, max, average, etc.
  - Done over a time period, such as a day, week, month, year.
  - Need to record time of min, max, last. Other aggregates do not have a time associated with them.
  - Wind max (gust) not only has a time, but also a direction.


## Possible spec formats

### Subsampling

### Group by

### Statistics

```Javascript
[
  {
    inTypes    : ['out_temperature'],
    outTypes   : ['out_temperature'],
    aggregation: 'avg',
  }
  {
    inTypes    : ['wind_speed', 'wind_dir'],
    outTypes   : ['windgust_speed', 'windgust_dir'],
    aggregation: 'max',
  },
  ...
]
```

Note that the cardinality of `inTypes` must match the cardinality of `outTypes`.