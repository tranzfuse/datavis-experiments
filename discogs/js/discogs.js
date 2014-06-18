(function() {

  'use strict';

  var discogsData, releases, yearAggregate, yearAggLen;

  var margin = {top: 20, right: 30, bottom: 30, left: 40},
    width = 960 - margin.left - margin.right,
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

  var chart = d3.select('.chart')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  //load up the dater, then build the chart.
  d3.json('discogs_collection_100.json', function(data) {
    discogsData = data;
    releases = discogsData.releases;
    yearAggregate = aggregateReleaseYears(releases);
    yearAggLen = yearAggregate.length;

    console.log(data);

    x.domain(yearAggregate.map(function(d) {return d.year;}));
    y.domain([0, d3.max(yearAggregate, function(d) {return d.count;})]);

    // x axis label and positioning
    chart.append('g')
      .attr('class', 'x axis')
      .attr('transform', 'translate(0,' + height + ')')
      .call(xAxis)
      .append('text')
      .attr('x', width)
      .attr('dx', '.71em')
      .attr('y', margin.bottom)
      .style('text-anchor', 'end')
      .text('Year Released');

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
    chart.selectAll('.bar')
      .data(yearAggregate)
      .enter().append('rect')
      .attr('class', 'bar')
      .attr('x', function(d) {
        return x(d.year);
      })
      .attr('y', function(d) {
        return y(d.count);
      })
      .attr('height', function(d) {
        return height - y(d.count);
      })
      .attr('width', x.rangeBand());

  });


  /**
   * rebuild formatted object from discogs json data source
   * @param {object} data the discogs json source
   * @returns {object}
   */
  function aggregateReleaseYears(data) {
    var summed = {},
      results = [],
      years = [];

    //extract the release years into an array
    data.forEach(function(el, i, arr) {
      years.push(el.basic_information.year);
    });

    //sum number of times each year occurs and store in results object
    years.map(function(year) {
      if (year in summed) {
        summed[year]++;
      } else {
        summed[year] = 1;
      }
    });

    //format data into array of objects
    for (var prop in summed) {
      var obj = {};
      obj.year = prop;
      obj.count = summed[prop];
      results.push(obj);
    }

    return results;
  }
}());
