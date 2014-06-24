'use strict';

var redis = require('redis'),
  client = redis.createClient(6379, '127.0.0.1'),
  q = require('q'),
  fs = require('fs'),
  redisClientGet = q.nbind(client.get, client),
  REDIS_KEY_SET_PAGE = 'discogs:page:',
  REDIS_KEY_LIST_KEYS = 'discogs:keys';

client.on('ready', function() {
  console.log('REDIS ready...');
  getDiscogsData(redisCallback);
});

/**
 * Need a way to handle async in a more dynamic way to get this to work.
 */
function getDiscogsDataBak() {
  var cache;
  client.llen(REDIS_KEY_LIST_KEYS, function(err, reply) {
    for (var i = 0; i < reply; i++) {
      client.lindex(REDIS_KEY_LIST_KEYS, i, function(err, reply) {
        client.get(reply, function(err, reply) {
          console.log(reply);
          cache.push(reply);
        });
      });
    }
  });
}

/**
 * This is ridonkulous. There's a better way...
 * @param {function} cb callback to be called after promise is resolved
 * @return undefined
 */
function getDiscogsData(cb) {
  q.all([
    redisClientGet('discogs:page:1'),
    redisClientGet('discogs:page:2'),
    redisClientGet('discogs:page:3'),
    redisClientGet('discogs:page:4'),
    redisClientGet('discogs:page:5'),
    redisClientGet('discogs:page:6'),
    redisClientGet('discogs:page:7'),
    redisClientGet('discogs:page:8'),
    redisClientGet('discogs:page:9'),
    redisClientGet('discogs:page:10'),
    redisClientGet('discogs:page:11'),
    redisClientGet('discogs:page:12'),
    redisClientGet('discogs:page:13'),
    redisClientGet('discogs:page:14'),
    redisClientGet('discogs:page:15'),
    redisClientGet('discogs:page:16'),
    redisClientGet('discogs:page:17'),
    redisClientGet('discogs:page:18'),
    redisClientGet('discogs:page:19'),
    redisClientGet('discogs:page:20'),
    redisClientGet('discogs:page:21'),
    redisClientGet('discogs:page:22')
  ]).then(function(data) {
    cb(data);
  });
}

function redisCallback(response) {
  var releasesArr = extractReleasesData(response);
  var results = {
    releases: releasesArr
  }
  var aggregated = aggregateReleaseData(results.releases);
  saveAggregated(JSON.stringify(aggregated));
}

/**
 * Build array of releases objects for easier aggregation of years info
 * @param {array} array array of discogs json objects from redis
 * @return {array}
 */
function extractReleasesData(array) {
  var cache = [];
  array.forEach(function(el, i, arr) {
    var data = JSON.parse(el);
    var releases = data.releases;
    cache.push.apply(cache, releases);
  });
  return cache;
}

/**
 * Write file to disk.
 * @param {object} obj the json object to save in the file
 * @return undefined
 */
function saveAggregated(obj) {
  var fileName = 'discogs_aggregated_years.json';
  fs.writeFile(fileName, obj, function(err) {
    if (err) throw err;
    console.log('Saved aggregated.');
  });
}

/**
 * Extract release year and format data. Reformat it into
 * a cute little condensed object and return it.
 * @param {object} data the discogs json
 * @return {object} summed the cute little condensed object
 */
function aggregateReleaseData(data) {
  var summed = {},
    condensed = [];

  //extract the release years into an array
  data.forEach(function(el, i, arr) {
    var obj = {},
      formats;

    formats = el.basic_information.formats;

    if (formats.length === 0) {
      formats = [{name: 'No Format Specified'}];
    }
    if (formats.length > 1) {
      formats = [formats.shift()];
    }

    obj.year = el.basic_information.year;
    obj.format = formats[0].name;

    condensed.push(obj);
  });

  condensed.map(function(release) {
    var year = release.year,
      format = release.format;

    if (year in summed) {
      summed[year]['count']++;
    } else {
      summed[year] = {
        count: 1,
        formats: {}
      }
    }

    if (format in summed[year]['formats']) {
      summed[year]['formats'][format]++;
    } else {
      summed[year]['formats'][format] = 1;
    }
  });

  return summed;
}
