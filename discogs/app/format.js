'use strict';

var redis = require('redis'),
  client = redis.createClient(6379, '127.0.0.1'),
  q = require('q'),
  fs = require('fs'),
  redisClientGet = q.nbind(client.get, client),
  REDIS_KEY_SET_PAGE = 'discogs:page:',
  REDIS_KEY_LIST_KEYS = 'discogs:keys',
  REDIS_KEY_HASH_YEAR = 'discogs:year';

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
  var store = {};

  //save to redis.
  //redis format:
  //'discogs:year:2001' Vinyl 181 CD 10 DVD 0 'No Format Specified' 0 total 191

  obj = JSON.parse(obj);
  for (var prop in obj) {
    var key = REDIS_KEY_HASH_YEAR + ':' + prop,
      tots = obj[prop]['total'],
      vinyl = obj[prop]['Vinyl'] || 0,
      cd = obj[prop]['CD'] || 0,
      noformat = obj[prop]['No Format Specified'] || 0,
      dvd = obj[prop]['DVD'] || 0,
      hash = {};

    hash = {
      'total': tots,
      'Vinyl': vinyl,
      'CD': cd,
      'No Format Specified': noformat,
      'DVD': dvd
    };

    saveHash(key, hash);
    store[prop] = hash;
  }

  function saveHash(k, v) {
    client.hmset(k, v, function(err, reply) {
      if (err) console.log(err);
      console.log('REDIS saved aggregated', k, v);
    });
  }

  var fileName = 'discogs_aggregated_years_reformatted.json';

  fs.writeFile(fileName, JSON.stringify(store), function(err) {
    if (err) throw err;
    console.log('Saved aggregated file', fileName);
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
      summed[year]['total']++;
    } else {
      summed[year] = {
        total: 1
      }
    }

    if (format in summed[year]) {
      summed[year][format]++;
    } else {
      summed[year][format] = 1;
    }
  });

  return summed;
}
