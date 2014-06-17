(function() {
  'use strict';

  var svg,
    svgW = 980,
    svgH = 250;

  var discogsData, releases, years, yearAggregate, yearAggLen;

  var bars,
    barW,
    barMargin = 5,
    barHeightMultiplier = 10;

  var labels;

  var yearsList, yearsListItems;

  svg = d3.select('#release-years')
    .append('svg')
    .attr('width', svgW)
    .attr('height', svgH);

  d3.json('discogs_collection_pg1.json', function(data) {
    discogsData = data;
    releases = discogsData.releases;
    yearAggregate = aggregateReleaseYears(releases);
    yearAggLen = yearAggregate.length;
    barW = svgW / yearAggLen;

    bars = svg.selectAll('rect')
    .data(yearAggregate)
    .enter()
    .append('rect');

    bars.attr('fill', 'teal')
    .attr('width', barW - barMargin)
    .attr('height', function(d) {
      var height = d.count * barHeightMultiplier;
      return height;
    })
    .attr('x', function(d, i) {
      return i * barW;
    })
    .attr('y', function(d, i) {
      return svgH - d.count * barHeightMultiplier;
    });

    labels = svg.selectAll('text')
      .data(yearAggregate)
      .enter()
      .append('text')
      .text(function(d) {
        return d.count;
      })
      .attr('x', function(d, i) {
        return i * barW + (barW - this.getComputedTextLength()) / 2;
      })
      .attr('y', function(d, i) {
        return svgH - d.count * barHeightMultiplier + 15; //15 is arbitrary, just nudging the label text a bit.
      })
      .attr('fill', 'white');

  });


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
