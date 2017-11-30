const url = require('url');
const Twitter = require('twitter');
var supeagent = require('superagent');


let twitterAPI = {
  client: null,
  searchEndpoint: '/search/tweets',
  
  connection: {
    consumer_key: '7KsJEqEC7muNdhuTZqZvBsLQG',
    consumer_secret: 'vtRxrKZMbyNCIKOKJxc69XK2EljZl0FzdbgiutHnvokLefkNvt',
    access_token_key: '935192415358668802-jiS6oQ4sFxzgLGClLUPyNNewSgMms72',
    access_token_secret: 'dki4h7sYhKzRtWqxECmeNBAcEd133u10ytPHo9v0V9d2b',
    bearer_token: null
  }
};

const TWEETS_PER_PAGE = 10;
const MAX_PAGES = 5;

let searchQuery = { 
  text: "@Russia",
  count: TWEETS_PER_PAGE,
  lang: 'ru',
  max_id: null,
  //result_type: null,
  include_entities: null
};

let tweets = [];


function getBearerToken(key, secret, cb) {
	var encodedKey = new Buffer(`${key}:${secret}`).toString('base64');
	supeagent
			.post('https://api.twitter.com/oauth2/token')
			.send('grant_type=client_credentials')
			.set('Authorization', `Basic ${encodedKey}`)
			.set('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8')
			.end(cb);
}

function initTwitterAPI() {
  let key = twitterAPI.connection.consumer_key;
  let secret = twitterAPI.connection.consumer_secret;
  let client = twitterAPI.connection.client;

  return new Promise(function(resolve, reject) {

    if (!client) {
      getBearerToken(key, secret, function(err, res) {
        if (err) {
          reject(new Error("Could not receive bearer token."));
        }
        twitterAPI.connection.bearer_token = res.body.access_token; // тут может быть ошибка при плохом интернете.
        
        twitterAPI.client = new Twitter({
          consumer_key: key,
          consumer_secret: secret,
          bearer_token: twitterAPI.connection.bearer_token
        });
  
        if (!twitterAPI.client) {
          reject(new Error("Twitter client initialization error."));
        } 
        resolve("Twitter API has been successfuly initialized.");  
      });

    } else {
      resolve("Twitter API already initialized.");
    }

  });
}

function getTweets(searchQuery, getPageResolve, getPageReject) {
  let nextPageUrl = {};

  return new Promise(function(getTweetsResolve, getTweetsReject) {

    if (twitterAPI.client) {
      let params = {
        q: searchQuery.text,
        count: searchQuery.count,
        lang: searchQuery.lang,
        max_id: searchQuery.max_id,
        //result_type: searchQuery.result_type,
        include_entities: searchQuery.include_entities
      }

      twitterAPI.client.get(twitterAPI.searchEndpoint, params)

      .then((data) => {  

        let arr = Array.from(data.statuses);
        let twts = arr.map((value, idx) => {
          return {
            id_str: value.id_str,
            text: value.text,
          }
        });
        tweets.push(twts);

        let decodedUrl = decodeURI(data.search_metadata.next_results);
        let parsedUrl = url.parse(decodedUrl, true);

        nextPageUrl = {
          text: parsedUrl.query.q,
          count: parsedUrl.query.count,
          lang: parsedUrl.query.lang,
          max_id: parsedUrl.query.max_id,
          //result_type: null,
          include_entities: null          
        }

        getTweetsResolve(twts);
           
      })
      .catch(function(err) {
        getTweetsReject(err);
      });

    } else {
      getTweetsReject(new Error("Twitter API not initialized."));
    }
  })
  .then(function(twts) {
    for(let tweet of twts) {
      console.log("Tweet Id: " + tweet.id_str);
    }
    getPageResolve(nextPageUrl);
  })
  .catch(function(err) {
    getPageReject(err);
  });
}


function getPage(searchQuery) {

  console.log("Page " + tweets.length);
  return new Promise(function(getPageResolve, getPageReject) {
    getTweets(searchQuery, getPageResolve, getPageReject);
  })
  .then(function(nextPageUrl) {
    if(tweets.length < MAX_PAGES) { 
      getPage(nextPageUrl);                 
    }     
  })
  .catch(function(err) {
    console.log(err);
  });
}

function run() {
  initTwitterAPI().then(function(msg) {
    console.log(msg);
    console.log("Query: " + searchQuery.text);
    getPage(searchQuery);
  })
  .catch(err => console.log(err));
}

run();