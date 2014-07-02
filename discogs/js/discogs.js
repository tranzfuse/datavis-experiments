(function() {

  'use strict';

  var yearAggregate, yearAggLen;

  var margin = {top: 20, right: 30, bottom: 30, left: 40},
    width = 1180 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

  var x = d3.scale.ordinal()
    .rangeRoundBands([0, width], .1);

  var y = d3.scale.linear()
    .range([height, 0]);

  var xAxis = d3.svg.axis()
    .scale(x)
    .orient('bottom');

  var yAxis = d3.svg.axis()
    .scale(y)
    .orient('left');

  var color = d3.scale.ordinal()
    .range(['#48D1CC', '#008B8B', '#8A2BE2', '#F0F']);

  var chart = d3.select('.chart')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  //load up the discogs data, then build the chart.
  d3.json('discogs_aggregated_years_reformatted.json', function(data) {
    yearAggregate = formatAggregated(data);
    yearAggLen = yearAggregate.length;

    color.domain(d3.keys(yearAggregate[0]).filter(function(key) {
        var filter = {total: false, year: false};
        return !(key in filter);
      }));

    yearAggregate.forEach(function(d) {
      var y0 = 0;
      d.formats = color.domain().map(function(name) {
        return {name: name, y0: y0, y1: y0 += +d[name]};
      });
      d.total = d.formats[d.formats.length - 1].y1;
    });

    yearAggregate.sort(function(a, b) {
      return a.year - b.year;
    });

    x.domain(yearAggregate.map(function(d) {return d.year;}));
    y.domain([0, d3.max(yearAggregate, function(d) {return d.total;})]);

    // x axis label and positioning
    chart.append('g')
      .attr('class', 'x axis')
      .attr('transform', 'translate(0,' + height + ')')
      .call(xAxis);

    // y axis label and positioning
    chart.append('g')
      .attr('class', 'y axis')
      .call(yAxis)
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 6)
      .attr('dy', '.71em')
      .style('text-anchor', 'end')
      .text('Releases Owned');

    //bars
    var bars = chart.selectAll('.bar')
      .data(yearAggregate)
      .enter()
      .append('g')
      .attr('class', 'g')
      .attr('transform', function(d) { return 'translate(' + x(d.year) + ',0)'; });

    bars.selectAll('rect')
      .data(function(d) { return d.formats; })
      .enter().append('rect')
        .attr('width', x.rangeBand())
        .attr('y', function(d) {return y(d.y1); })
        .attr('height', function(d) { return y(d.y0) - y(d.y1); })
        .style('fill', function(d) { return color(d.name); });

    var legend = chart.selectAll('.legend')
      .data(color.domain().slice().reverse())
      .enter().append('g')
        .attr('class', 'legend')
        .attr('transform', function(d, i) { return 'translate(0,' + i * 20 + ')'; });

    legend.append('rect')
      .attr('x', width - 18)
      .attr('width', 18)
      .attr('height', 18)
      .style('fill', color);

    legend.append('text')
      .attr('x', width - 24)
      .attr('y', 9)
      .attr('dy', '.35em')
      .style('text-anchor', 'end')
      .text(function(d) { return d; });

  });

  /**
   * rebuild formatted object from discogs json data source
   * @param {object} data the discogs json source
   * @returns {object}
   */
  function formatAggregated(data) {
    var results = [];

    //format data into array of objects
    for (var prop in data) {
      var obj = {};
      obj.year = prop;
      obj.total = data[prop].total;
      obj.Vinyl = data[prop].Vinyl;
      obj.CD = data[prop].CD;
      obj.DVD = data[prop].DVD;
      obj['No Format Specified'] = data[prop]['No Format Specified'];
      results.push(obj);
    }

    return results;
  }

}());
