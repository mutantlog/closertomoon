// Our Twitter library
var request = require('request');
var cheerio = require('cheerio');
var _ = require('underscore.deferred');
var Twit = require('twit');
var moment = require('moment');
moment().format();

// We need to include our configuration file
var T = new Twit(require('./config.js'));

function tweetEvent(event, eventType) {
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

function retrieveAllEvents(dayToFind) {
	var dfd = new _.Deferred();
	var monthToFind = dayToFind.get('month')+1;
	var url = "http://history.muffinlabs.com/date/" + monthToFind + "/" + dayToFind.get('date');
	var events = new Array();
	var deaths = new Array();
	var births = new Array();
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
			for (var exKey in body['data']['Deaths']) {
				if (body['data']['Deaths'][exKey]['year'] == dayToFind.get('year')) {
					deaths.push(body['data']['Deaths'][exKey]['text']);
				}
			}
			for (var exKey in body['data']['Births']) {
				if (body['data']['Births'][exKey]['year'] == dayToFind.get('year')) {
					births.push(body['data']['Births'][exKey]['text']);
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
	dayInHistory.subtract(3, 'days'); // Uncomment and edit this line if you need to move the date around for testing
	var listOfEvents = new Array();
	retrieveAllEvents(dayInHistory).then(function(listOfEvents) {
		listOfEvents.events;
		if (listOfEvents.events.length > 0) {
			var eventToTweet = listOfEvents.events[Math.floor(Math.random() * listOfEvents.events.length)];
			tweetEvent(eventToTweet, "Event");
		} 
		else if (listOfEvents.deaths.length > 0) {
			var eventToTweet = listOfEvents.deaths[Math.floor(Math.random() * listOfEvents.deaths.length)];
			tweetEvent(eventToTweet, "Death");
		}
		else if (listOfEvents.births.length > 0) { // This if statement could be skipped, but it's here for form and parallelism
			var eventToTweet = listOfEvents.births[Math.floor(Math.random() * listOfEvents.births.length)];
			tweetEvent(eventToTweet, "Birth");
		}
	},
	function (err) {
		console.log("No Events");
	});
}

// Try to retweet something as soon as we run the program...
getEvent();
//tweetEvent();

// This code is originally from dariusk but I'm calling this script daily via cron instead
// ...and then every hour after that. Time here is in milliseconds, so
// 1000 ms = 1 second, 1 sec * 60 = 1 min, 1 min * 60 = 1 hour --> 1000 * 60 * 60
//setInterval(tweetEvent, 1000 * 60 * 60);
