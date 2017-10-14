/* Cribbed (with permission) from Peter Finley's "mesowx" project.
 https://bitbucket.org/lirpa/mesowx
 */

// Expose d3 from within Plotly
var d3 = Plotly.d3;

var WindCompass = (function () {

    function WindCompass(config) {

        var self = this;
        var VIEW_PORT = 100;
        var RADIUS = 90;

        var ORDINAL_TEXT = ["N", "NNE", "NE", "ENE",
            "E", "ESE", "SE", "SSE",
            "S", "SSW", "SW", "WSW",
            "W", "WNW", "NW", "NNW"];

        function defaultWindDirToCardinalConverter(dir) {
            var ordinal = Math.round(dir / 22.5);
            if (ordinal == 16) ordinal = 0;
            return ORDINAL_TEXT[ordinal];
        }

        var DEFAULT_CONFIG = {
            containerId                            : 'windCompass',
            ticksPerQuad                           : 8,
            size                                   : null,
            animateDirDuration                     : 1000,
            maxPrevDirs                            : 100,
            maxPrevDirOpacity                      : 1,
            prevDirOpacityEase                     : d3.ease('sin'),
            tickLength                             : 10,
            keyFunction                            : function (d) {
                return d[0];
            },
            dirValueFunction                       : function (d) {
                // Convert undefined and null to zero
                return d[1] ? d[1] : 0;
            },
            speedValueFunction                     : function (d) {
                return d[2];
            },
            windSpeedUnitLabel                     : "mph",
            windDirToCardinalLabelConverterFunction: defaultWindDirToCardinalConverter
        };

        if (!config) config = DEFAULT_CONFIG;
        else applyDefaults(config, DEFAULT_CONFIG);
        self.config = config;

        var tickInterval = generateTickPositions(self.config.ticksPerQuad);

        self.prevDirs = [];

        var container = (typeof self.config.containerId === 'string') ? "#" + self.config.containerId : self.config.containerId;

        // default size to the width of the parent container XXX it's not ideal that this is the only need for jquery
        if (!self.config.size) self.config.size = $(container).parent().width();

        self.compass = d3.select(container)
                         .append("svg:svg")
                         .attr("width", self.config.size)
                         .attr("height", self.config.size)
                         .attr("viewBox", "0 0 200 200");
        // compass edge
        self.compass.append("svg:circle")
            .attr("class", "edge")
            .attr("cx", "50%")
            .attr("cy", "50%")
            .attr("r", RADIUS);
        // speed display
        var speedDisplay = self.compass.append("text")
                               .attr("class", "speedDisplay")
                               .attr("dx", "50%")
                               .attr("dy", "50%");
        // speed readout
        speedDisplay
            .append("tspan").attr("class", "speedReadout")
            .text("0");
        // speed suffix
        speedDisplay
            .append("tspan").attr("class", "speedSuffix")
            .text(self.config.windSpeedUnitLabel);

        var ticks = self.compass.selectAll(".tick").data(tickInterval);
        ticks.enter().append("path")
             .attr("class", function (d) {
                 var classes = ["tick"];
                 if (d % 90 == 0) classes.push("tick90");
                 if (d % 45 == 0) classes.push("tick45");
                 return classes.join(" ");
             })
             .transition().duration(1000)
             .attr("d", "M100 " + (VIEW_PORT - RADIUS) + " L100 " + (VIEW_PORT - RADIUS + self.config.tickLength))
             // variable length ticks
             /*.attr("d", function(d) {
              var tickLen = 3;
              tickLen *= (d%90==0 ? 2 : 1);
              tickLen *= (d%45==0 ? 2 : 1);
              return "M100 6 L100 "+(6+tickLen)
              })*/
             .attr("transform", function (d) {
                 return "rotate(" + d + " 100 100)";
             });
    }

    // This holds the last non-null wind direction:
    var lastDir = 0;

    WindCompass.prototype.updateWind = function (val) {

        var self = this;
        var data = [val];
        // If wind direction is undefined, set it to the last value
        if (val[1] === undefined || val[1] === null)
            val[1] = lastDir;
        lastDir = val[1];

        // current direction pointer
        var currDir = self.compass.selectAll(".currDir")
                          .data(data);
        currDir.enter().append("path")
               .attr("class", "currDir")
               .attr("d", "M91 0 L100 9 L109 0 Z");
        currDir
            .transition().duration(self.config.animateDirDuration)
            .attrTween("transform", function (d, i, a) {
                return interpolateRotate(a, "rotate(" + self.config.dirValueFunction(d) + " 100 100)");
            })
            .each(function () {
                // transition ordinal display in tandem
                d3.transition(self.compass.selectAll(".ordinalDisplay"))
                  .tween("ordinal", function (d, i) {
                      var i = interpolateDegrees(this.getAttribute("rawValue"), self.config.dirValueFunction(d));
                      return function (t) {
                          var v = i(t);
                          this.setAttribute("rawValue", v);
                          this.textContent = self.config.windDirToCardinalLabelConverterFunction(v);
                          //this.textContent = Math.round(v);
                      };
                  });
            })
            .each('end', function () {
                if (self.config.maxPrevDirs) {
                    // update previous dirs
                    self.prevDirs.push(val);
                    if (self.prevDirs.length > self.config.maxPrevDirs) self.prevDirs.shift();
                    self.updatePrevDirs();
                }
            });

        // wind speed display
        var speedReadout = self.compass.selectAll(".speedReadout")
                               .data(data);
        speedReadout
        /*.style("fill", function(d) {
         var oldVal = this.textContent;
         var newVal = self.config.speedValueFunction(d);
         if( newVal != oldVal ) return ( newVal > oldVal ? "#00C90D" : "#E00000");
         return null;
         })*/
            .text(function (d) {
                return Math.round(self.config.speedValueFunction(d));
            });
        /*.classed('value-up', function(d) {
         var oldVal = this.textContent;
         var newVal = self.config.speedValueFunction(d);
         return newVal > oldVal;
         })
         .classed('value-down', function(d) {
         var oldVal = this.textContent;
         var newVal = self.config.speedValueFunction(d);
         return newVal < oldVal;
         });*/
        /*.transition()
         .duration(1500)
         .style("fill", "#616161");*/

        // ordinal display
        var degreeDisplay = self.compass.selectAll(".ordinalDisplay")
                                .data(data);
        degreeDisplay.enter().append("text")
                     .attr("class", "ordinalDisplay")
                     .attr("dx", "50%")
                     .attr("dy", "75%")
                     .text(function (d) {
                         return self.config.windDirToCardinalLabelConverterFunction(self.config.dirValueFunction(d));
                     });
    };

    WindCompass.prototype.loadInitialPrevDirs = function (initialPrevDirs) {
        var self = this;
        if (!self.config.maxPrevDirs) return;
        self.prevDirs = initialPrevDirs;
        self.updatePrevDirs();
    };

    WindCompass.prototype.updatePrevDirs = function () {
        var self = this;

        function calculatePrevDirOpacity(d, i) {
            return self.config.prevDirOpacityEase((i + 1) / self.prevDirs.length) * self.config.maxPrevDirOpacity;
        }

        var prevDir = self.compass.selectAll(".prevDir")
                          .data(self.prevDirs, self.config.keyFunction);

        prevDir.enter().insert("path", ".currDir")
               .attr("class", "prevDir")
               .attr("d", "M91 0 L100 9 L109 0 Z");

        prevDir
            .attr("transform", function (d, i) {
                return "rotate(" + self.config.dirValueFunction(d) + " 100 100)";
            })
            .style("fill-opacity", calculatePrevDirOpacity)
            .style("stroke-opacity", calculatePrevDirOpacity);

        prevDir.exit()
               .style("fill-opacity", 0)
               .style("stroke-opacity", 0)
               .remove();
    };

    function generateTickPositions(ticksPerQuad) {
        var positions = [];
        var tickInterval = 360 / 4 / ticksPerQuad;
        for (var q = 0; q < 360; q += tickInterval) {
            positions.push(q);
        }
        return positions;
    }

    var ROTATE_REGEX = /rotate\((\d+\.?\d*)(.*)\)/;

    function interpolateRotate(a, b) {
        var ma = ROTATE_REGEX.exec(a);
        var mb = ROTATE_REGEX.exec(b);
        da = 0;
        db = 0;
        if (ma) da = ma[1];
        if (mb) db = mb[1];
        if (da == 0) da = 0.000001;
        if (db == 0) db = 0.000001;
        return function (t) {
            return "rotate(" + interpolateDegrees(da, db)(t) + mb[2] + ")";
        };
    }

    function interpolateDegrees(a, b) {
        if (a == null) a = 0;
        if (b == null) b = 0;
        a = parseFloat(a);
        b = parseFloat(b);
        /*
          * TODO: If this 'if' statement is rejected, the function will return undefined
          * instead of an actual function.
          */
        if (a >= 0 && a < 360 && b >= 0 && b < 360) {
            if (Math.abs(b - a) > 180) {
                return function (t) {
                    var ax, bx;
                    var shift;
                    if (a > b) {
                        shift = 360 - a;
                        ax = 0;
                        bx = b + shift;
                    } else {
                        shift = 360 - b;
                        bx = 0;
                        ax = a + shift;
                    }
                    var v = d3.interpolateNumber(ax, bx)(t) - shift;
                    if (v < 0) v += 360;
                    return v;
                };
            }
            return d3.interpolateNumber(a, b);
        }
    }

    function applyDefaults(config, defaults) {
        for (var prop in defaults) {
            if (!config.hasOwnProperty(prop)) config[prop] = defaults[prop];
        }
    }

    return WindCompass;

})();

