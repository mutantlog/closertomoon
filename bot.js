// Our Twitter library
//var request = require('request');
var request = require('sync-request');
var cheerio = require('cheerio');
var _ = require('underscore.deferred');
var Twit = require('twit');
var moment = require('moment');
var fs = require('fs');
moment().format();

// We need to include our configuration file
var T = new Twit(require('./config.js'));

var tweets = new Array();
var debug = true;

function composeTweet(event, eventType) {
	var tweetText = event; 
	if (eventType == "Event") {
		var tweetText = tweetText.substr(0,(tweetText.length)-1); // Events typically end in a period, which we don't want in the middle of a tweet
		if (tweetText.length > 93) { // If the tweet will be too long, truncate the event with an ellipsis
			tweetText = tweetText.substr(0,92)+"…";
		}
		tweetText = tweetText + ' occurred closer to the moon landing than today';
	}
	else if (eventType == "Death") {
		if (tweetText.length > 97) { // If the tweet will be too long, truncate the death with an ellipsis
			tweetText = tweetText.substr(0,96 )+"…";
		}
		tweetText = tweetText + ' died closer to the moon landing than today';
	} else if (eventType == "Birth") { // This if statement could be skipped, but it's here for form and parallelism
		if (tweetText.length > 93) { // If the tweet will be too long, truncate the death with an ellipsis
			tweetText = tweetText.substr(0,92 )+"…";
		}
		tweetText = tweetText + ' was born closer to the moon landing than today';
	}
//	console.log(tweetText);
	return(tweetText);
}

function tweetEvent(tweetText) {
	if (debug) {
		console.log(tweetText)
	}
	else {
		T.post('statuses/update', { status: tweetText }, function (err, data, response) {
	//		console.log(err, data);
			if (response) {
	//			console.log('Success! It tweeted an event');
			}
			if (err) {
				console.log('There was an error with Twitter:', error);
			}
		})
	}
}

function getLastTweet() {
	var dfd = new _.Deferred();
	var tweets = new Array();
	T.get('statuses/home_timeline', {count: 10}, function(err, data, response) {
//		console.log(err, data);
		if (data) {
			for (var exKey in data) {
				tweets.push(data[exKey]['text']);
			}
			dfd.resolve(tweets);
		}
		if (err) {
			console.log('There was an error fetching tweets:', err);
			dfd.reject();
		}
	})
	return dfd.promise();
}

function retrieveAllEvents(dayToFind) {
	var dfd = new _.Deferred();
	var events = new Array();
	var deaths = new Array();
	var births = new Array();
	
	var eventsFile = "data/"+dayToFind.format("MM-DD")+".json";
	var eventsJSON;
	try {
		eventsJSON = JSON.parse(fs.readFileSync(eventsFile));
	} catch (e) {
		if (e.code === 'ENOENT') {
			console.log('File not found!');
			var url = "http://history.muffinlabs.com/date/" + dayToFind.format("M/D"); // This site doesn't require 0 padding of months or days
			var results = request('GET', url);
			eventsJSON = JSON.parse(results.getBody());
		} 
		else {
			throw e;
		}
	}
	for (var exKey in eventsJSON['data']['Events']) {
		if (eventsJSON['data']['Events'][exKey]['year'] == dayToFind.get('year')) {
			events.push(eventsJSON['data']['Events'][exKey]['text']);
		}
	}
	for (var exKey in eventsJSON['data']['Deaths']) {
		if (eventsJSON['data']['Deaths'][exKey]['year'] == dayToFind.get('year')) {
			deaths.push(eventsJSON['data']['Deaths'][exKey]['text']);
		}
	}
	for (var exKey in eventsJSON['data']['Births']) {
		if (eventsJSON['data']['Births'][exKey]['year'] == dayToFind.get('year')) {
			births.push(eventsJSON['data']['Births'][exKey]['text']);
		}
	}
	if (events.length > 0 || deaths.length > 0 || births.length > 0) {
		dfd.resolve({
			events: events,
			deaths: deaths,
			births: births
		});
	}
	else {
		dfd.reject();
	}
	return dfd.promise();
}

function getEvent() {
	var today = moment();
	var landing = moment([1969, 6, 20]);
	var dayInHistory = moment();
	var recentTweets = new Array();
	var tweeted = false;
	dayInHistory.subtract(Math.ceil(today.diff(landing, 'days')/2), 'days');
//	dayInHistory.subtract(10, 'days'); // Uncomment and edit this line if you need to move the date around for testing
	var listOfEvents = new Array();
	retrieveAllEvents(dayInHistory).then(function(returnedListOfEvents) {
		getLastTweet().then(function(recentTweets) {
			var listOfEvents = returnedListOfEvents;
			while (listOfEvents.events.length > 0 && tweeted == false) {
				var eventToTweet = listOfEvents.events[Math.floor(Math.random() * listOfEvents.events.length)];
				var composedEventToTweet = composeTweet(eventToTweet, "Event");
				if (recentTweets.indexOf(composedEventToTweet) >= 0) {
					var splicePoint = listOfEvents.events.indexOf(eventToTweet);
					listOfEvents.events.splice(splicePoint,1);
				}
				else {
					tweeted = true;		
					tweetEvent(composedEventToTweet);
				}
			}
			while (listOfEvents.deaths.length > 0 && tweeted == false) {
				var eventToTweet = listOfEvents.deaths[Math.floor(Math.random() * listOfEvents.deaths.length)];
				var composedEventToTweet = composeTweet(eventToTweet, "Death");
				if (recentTweets.indexOf(composedEventToTweet) >= 0) {
					var splicePoint = listOfEvents.deaths.indexOf(eventToTweet);
					listOfEvents.deaths.splice(splicePoint,1);
				}
				else {
					tweeted = true;	
					tweetEvent(composedEventToTweet);
				}
			}
			while (listOfEvents.births.length > 0 && tweeted == false) {
				var eventToTweet = listOfEvents.births[Math.floor(Math.random() * listOfEvents.births.length)];
				var composedEventToTweet = composeTweet(eventToTweet, "Birth");
				if (recentTweets.indexOf(composedEventToTweet) >= 0) {
					var splicePoint = listOfEvents.births.indexOf(eventToTweet);
					listOfEvents.births.splice(splicePoint,1);
				}
				else {
					tweeted = true;
					tweetEvent(composedEventToTweet);
				}
			}
			if (tweeted == false) {
				console.log("I guess there were duplicates today");
			}
		})
	},
	function (err) {
		console.log("No Events");
	});
}

// Try to retweet something as soon as we run the program...
getEvent();

// This code is originally from dariusk but I'm calling this script daily via cron instead
// ...and then every hour after that. Time here is in milliseconds, so
// 1000 ms = 1 second, 1 sec * 60 = 1 min, 1 min * 60 = 1 hour --> 1000 * 60 * 60
//setInterval(getEvent, 1000 * 60 * 60);
