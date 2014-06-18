var redis = require('redis'),
  client = redis.createClient(6379, '127.0.0.1'),
  http = require('http'),
  merge = require('merge'),
  url = require('url'),
  path = '/users/tranzfuse/collection/folders/0/releases?per_page=100',
  options = {
    hostname: 'api.discogs.com',
    path: path,
    method: 'GET',
    headers: {
      'User-Agent': 'MyDiscogsDataVisualized/1.0 +http://localhost'
    }
  },

  /*
   * Store array of chunked data as it streams from endpoint
   */
  data = [],

  /**
   * Store each returned and parsed json dataset
   */
  cache = [];

client.on('ready', function() {
  console.log('REDIS ready...');
  fetchDiscogsData(options);
});

/**
 * Fetch Discogs data from Discogs api.
 * Iterate through pagination data of each returned dataset to fetch all collection data.
 * @param {object} config Options for http.get call
 * @return undeifned
 */
function fetchDiscogsData(config) {
  options = merge(options, config);
  http.get(options, function(res) {
      console.log("Discogs response: " + res.statusCode);

      res.on('data', function(chunk) {
        data.push(chunk);
      });
      res.on('end', function() {
        var result = JSON.parse(data.join(''));
        var pagi = result.pagination;
        console.log('Receiving page ', pagi.page);
        cache.push(result);
        if (pagi.page < pagi.pages) {
          data = [];
          var newPath = path + getUrlQueryString(result.pagination.urls.next);
          var opts = {
            path: newPath
          };
          fetchDiscogsData(opts);
        } else {
          console.log('Done fetching, store json in db...');
          storeDiscogsData(cache);
        }
      });
  }).on('error', function(e) {
      console.log("Got error: " + e.message);
  });
}

/**
 * Parse and return query string from url
 * @param {string} discogsUrl
 * @return {string} the url's query string
 */
function getUrlQueryString(discogsUrl) {
  var parsed = url.parse(discogsUrl);
  return parsed.search;
}

/**
 * Store discogs json data to data store
 * @param {array} data Array of json objects fetched from discogs api
 * @return boolean
 */
function storeDiscogsData(data) {
  data.forEach(function(el, i, arr) {
    var key = 'discogs:page:' + el.pagination.page;
    client.get(key, function(err, reply) {
      if (null === reply) {
        client.set(key, JSON.stringify(el), function(err, reply) {
          if (err) {
            console.log('REDIS error when trying to write:', key, ' Error:', err);
          } else {
            console.log('REDIS success! Stored data for', key);
            saveDiscogsKey(key);
          }
        });
      }
    });
  });
  return true;
}

/**
 * Push discogs key onto keys list in Redis
 * @param key {string} The discogs key
 * @return undefined
 */
function saveDiscogsKey(key) {
  client.rpush('discogs:keys', key, function(err, reply) {
    if (err) {
      console.log('REDIS error when trying to save key:', key, ' Error:', err);
    } else {
      console.log('REDIS success! Pushed key', key, ' onto discogs:keys');
    }
  });
}
