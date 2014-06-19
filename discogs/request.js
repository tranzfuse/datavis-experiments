var redis = require('redis'),
  client = redis.createClient(6379, '127.0.0.1'),
  http = require('http'),
  merge = require('merge'),
  url = require('url'),
  endpoint = '/users/tranzfuse/collection/folders/0/releases',
  per_page = 100,
  qs = '?per_page=' + per_page,
  path = endpoint + qs,
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
  cache = [],

  REDIS_KEY_SET_PAGE = 'discogs:page:',
  REDIS_KEY_LIST_KEYS = 'discogs:keys';

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
        var result = JSON.parse(data.join('')),
          pagi = result.pagination,
          newPath,
          opts,
          key;

        console.log('Receiving data for page ', pagi.page);
        cache.push(result);

        if (pagi.page < pagi.pages) {
          data = [];
          newPath = endpoint + getUrlQueryString(result.pagination.urls.next);
          opts = {
            path: newPath
          };
          fetchDiscogsData(opts);
        } else {
          console.log('Done fetching, save json in db...');
          cache.forEach(function(el, i, arr) {
            key = REDIS_KEY_SET_PAGE + el.pagination.page;
            saveDiscogsData(key, el);
          });
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
  var parsed = url.parse(discogsUrl, true);
  return parsed.search;
}

/**
 * Store discogs json data to data store
 * @param {array} data Array of json objects fetched from discogs api
 * @return undefined
 */
function saveDiscogsData(key, data) {
  client.get(key, function(err, reply) {
    if (null === reply) {
      client.set(key, JSON.stringify(data), function(err, reply) {
        if (err) {
          console.log('REDIS error! Trying to write:', key, ' Error:', err);
        } else {
          console.log('REDIS success! Stored data for', key);
          saveDiscogsKey(key);
        }
      });
    } else {
      console.log('REDIS data for key', key, 'already exists.');
    }
  });
}

/**
 * Push discogs key onto discogs:keys list in Redis
 * @param key {string} The discogs key
 * @return undefined
 */
function saveDiscogsKey(key) {
  client.rpush(REDIS_KEY_LIST_KEYS, key, function(err, reply) {
    if (err) {
      console.log('REDIS error! Trying to save key:', key, 'Error:', err);
    } else {
      console.log('REDIS success! Pushed key', key, 'onto discogs:keys');
    }
  });
}
