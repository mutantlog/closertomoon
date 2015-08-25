// Our Twitter library
var request = require('request');
var cheerio = require('cheerio');
var _ = require('underscore.deferred');
var Twit = require('twit');
var moment = require('moment');
moment().format();

// We need to include our configuration file
var T = new Twit(require('./config.js'));

function tweetEvent(event) {
	var eventToTweet = event.substr(0,(event.length)-1); // Events typically end in a period, which we don't want in the middle of a tweet
	if (eventToTweet.length > 93) { // If the tweet will be too long, truncate the event with an ellipsis
		eventToTweet = eventToTweet.substr(0,92)+"…";
	}
	T.post('statuses/update', { status: eventToTweet+' occurred closer to the moon landing than today' }, function (err, data, response) {
//		console.log(err, data);
		if (response) {
//			console.log('Success! It tweeted an event');
		}
		if (err) {
//			console.log('There was an error with Twitter:', error);
		}
	})
}

function tweetDeath(event) {
	var eventToTweet = event;
	if (eventToTweet.length > 97) { // If the tweet will be too long, truncate the death with an ellipsis
		eventToTweet = eventToTweet.substr(0,96 )+"…";
	}
	T.post('statuses/update', { status: eventToTweet+' died closer to the moon landing than today' }, function (err, data, response) {
//		console.log(err, data);
		if (response) {
//			console.log('Success! It tweeted an event');
		}
		if (err) {
//			console.log('There was an error with Twitter:', error);
		}
	})
}

function tweetBirth(event) {
	var eventToTweet = event;
	if (eventToTweet.length > 93) { // If the tweet will be too long, truncate the birth with an ellipsis
		eventToTweet = eventToTweet.substr(0,92 )+"…";
	}
	T.post('statuses/update', { status: eventToTweet+' was born closer to the moon landing than today' }, function (err, data, response) {
//		console.log(err, data);
		if (response) {
//			console.log('Success! It tweeted an event');
		}
		if (err) {
//			console.log('There was an error with Twitter:', error);
		}
	})
}


function retrieveEvents(dayToFind) {
	var dfd = new _.Deferred();
	var monthToFind = dayToFind.get('month')+1;
	var url = "http://history.muffinlabs.com/date/" + monthToFind + "/" + dayToFind.get('date');
	var events = new Array();
	request({
	    url: url,
	    json: true
	}, function (error, response, body) {
	    if (!error && response.statusCode === 200) {
			for (var exKey in body['data']['Events']) {
				if (body['data']['Events'][exKey]['year'] == dayToFind.get('year')) {
					events.push(body['data']['Events'][exKey]['text']);
				}
			}
			if (events.length > 0) {
				dfd.resolve(events);
			}
			else {
				dfd.reject();
			}
	    }
	    else {
	    	console.log("error");
	    	dfd.reject();
	    }
	})	
	return dfd.promise();
}

function retrieveDeaths(dayToFind) {
	var dfd = new _.Deferred();
	var monthToFind = dayToFind.get('month')+1;
	var url = "http://history.muffinlabs.com/date/" + monthToFind + "/" + dayToFind.get('date');
	var events = new Array();
	request({
	    url: url,
	    json: true
	}, function (error, response, body) {
	    if (!error && response.statusCode === 200) {
			for (var exKey in body['data']['Deaths']) {
				if (body['data']['Deaths'][exKey]['year'] == dayToFind.get('year')) {
					events.push(body['data']['Deaths'][exKey]['text']);
				}
			}
			if (events.length > 0) {
				dfd.resolve(events);
			}
			else {
				dfd.reject();
			}
	    }
	    else {
	    	console.log("error");
	    	dfd.reject();
	    }
	})	
	return dfd.promise();
}

function retrieveBirths(dayToFind) {
	var dfd = new _.Deferred();
	var monthToFind = dayToFind.get('month')+1;
	var url = "http://history.muffinlabs.com/date/" + monthToFind + "/" + dayToFind.get('date');
	var events = new Array();
	request({
	    url: url,
	    json: true
	}, function (error, response, body) {
	    if (!error && response.statusCode === 200) {
			for (var exKey in body['data']['Births']) {
				if (body['data']['Births'][exKey]['year'] == dayToFind.get('year')) {
					events.push(body['data']['Births'][exKey]['text']);
				}
			}
			if (events.length > 0) {
				dfd.resolve(events);
			}
			else {
				dfd.reject();
			}
	    }
	    else {
	    	console.log("error");
	    	dfd.reject();
	    }
	})	
	return dfd.promise();
}

function getEvent() {
	var today = moment();
	var landing = moment([1969, 6, 20]);
	var dayInHistory = moment();
	dayInHistory.subtract(Math.ceil(today.diff(landing, 'days')/2), 'days');
//	dayInHistory.subtract(2, 'days');
 	var eventFound = false;
	var listOfEvents = new Array();
	retrieveEvents(dayInHistory).then(function(listOfEvents) {
		var eventToTweet = listOfEvents[Math.floor(Math.random() * listOfEvents.length)];
		tweetEvent(eventToTweet);
	},
	function (err) {
		retrieveDeaths(dayInHistory).then(function(listOfEvents) {
			var eventToTweet = listOfEvents[Math.floor(Math.random() * listOfEvents.length)];
			tweetDeath(eventToTweet);
		},
		function (err) {
			retrieveBirths(dayInHistory).then(function(listofEvents) {
				var eventToTweet = listOfEvents[Math.floor(Math.random() * listOfEvents.length)];
				tweetBirth(eventToTweet);
			},
			function (err) {
				console.log("No events");
			})
		})
	});
}

// Try to retweet something as soon as we run the program...
getEvent();
//tweetEvent();
// ...and then every hour after that. Time here is in milliseconds, so
// 1000 ms = 1 second, 1 sec * 60 = 1 min, 1 min * 60 = 1 hour --> 1000 * 60 * 60
//setInterval(tweetEvent, 1000 * 60 * 60);
