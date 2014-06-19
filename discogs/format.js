var redis = require('redis'),
  client = redis.createClient(6379, '127.0.0.1'),
  q = require('q'),
  fs = require('fs'),
  cache = [],
  releases = 
  REDIS_KEY_SET_PAGE = 'discogs:page:',
  REDIS_KEY_LIST_KEYS = 'discogs:keys';

redisClientGet = q.nbind(client.get, client);

client.on('ready', function() {
  console.log('REDIS ready...');
  getDiscogsData();
});

function getDiscogsDataBak() {
  client.llen(REDIS_KEY_LIST_KEYS, function(err, reply) {
    for (var i = 0; i < reply; i++) {
      client.lindex(REDIS_KEY_LIST_KEYS, i, function(err, reply) {
        console.log(reply);
        client.get(reply, function(err, reply) {
          console.log(reply);
          cache.push(reply);
        });
      });
    }
  });
}

/**
 * This is ridonkulous. There's a better way.
 */
function getDiscogsData() {
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
    data.forEach(function(el, i, arr) {
      var data = JSON.parse(el);
      var releases = data.releases;
      cache.push.apply(cache, releases);
    });
    var results = {
      releases: cache
    };
    var aggregated = aggregateReleaseYears(results.releases);
    saveAggregated(JSON.stringify(aggregated));
  });
}

/**
 * rebuild formatted object from discogs json data source
 * @param {object} data the discogs json source
 * @returns {object}
 */
function aggregateReleaseYears(data) {
  var summed = {},
    years = [];

  //extract the release years into an array
  data.forEach(function(el, i, arr) {
    years.push(el.basic_information.year);
  });

  //sum number of times each year occurs
  years.map(function(year) {
    if (year in summed) {
      summed[year]++;
    } else {
      summed[year] = 1;
    }
  });

  return summed;
}

function saveAggregated(obj) {
  fs.writeFile('discogs_aggregated_years.json', obj, function(err) {
    if (err) throw err;
    console.log('Saved aggregated.');
  });
}

/**
 * format data into array of objects
 */
function formatSummed(summed) {
  for (var prop in summed) {
    var obj = {};
    obj.year = prop;
    obj.count = summed[prop];
    results.push(obj);
  }
}
