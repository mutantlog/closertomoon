var request = require('request');
var _ = require('underscore.deferred');
var Twit = require('twit');
var moment = require('moment');
var fs = require('fs');
var T = new Twit(require('./config.js')); // We need to include our configuration file
moment().format();
var debug = false;

function composeTweet(event, eventType) {
	var tweetText = event; 
	if (eventType == "Event") {
		tweetText = tweetText.substr(0,(tweetText.length)-1); // Events typically end in a period, which we don't want in the middle of a tweet
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
	return(tweetText);
}

function tweetEvent(tweetText) {
	if (debug) {
		console.log(tweetText);
	}
	else {
		T.post('statuses/update', { status: tweetText }, function (err, data, response) {
			if (err) {
				console.log('There was an error with Twitter:', error);
			}
		});
	}
}

function getLastTweet() {
	var dfd = new _.Deferred();
	var tweets = [];
	T.get('statuses/home_timeline', {count: 10}, function(err, data, response) {
		if (data) {
			for (var exKey in data) {
				tweets.push(data[exKey].text);
			}
			dfd.resolve(tweets);
		}
		if (err) {
			console.log('There was an error fetching tweets:', err);
			dfd.reject();
		}
	});
	return dfd.promise();
}

function parseEvents(eventsJSON, dayToFind) { // This function parses a set of events from the sources in retrieveAllEvents(dayToFind) and dumps out the ones that match the desired year into an array of arrays
	var events = [];
	var deaths = [];
	var births = [];
	var exKey;
	for (exKey in eventsJSON.data.Events) {
		if (eventsJSON.data.Events[exKey].year == dayToFind.get('year')) {
			events.push(eventsJSON.data.Events[exKey].text);
		}
	}
	for (exKey in eventsJSON.data.Deaths) {
		if (eventsJSON.data.Deaths[exKey].year == dayToFind.get('year')) {
			deaths.push(eventsJSON.data.Deaths[exKey].text);
		}
	}
	for (exKey in eventsJSON.data.Births) {
		if (eventsJSON.data.Births[exKey].year == dayToFind.get('year')) {
			births.push(eventsJSON.data.Births[exKey].text);
		}
	}
	return {events: events, deaths: deaths, births: births};
}

function retrieveAllEvents(dayToFind) {
	var dfd = new _.Deferred();
	var allEvents = [];
	var eventsFile = "data/"+dayToFind.format("MM-DD")+".json"; // Local data files have 0 padding of single digit months and dates
	var eventsJSON;
	fs.readFile(eventsFile, function (err, data) { // Try to find a local data file generated using https://github.com/muffinista/history_parse
		if (err) { 
			if (err.code === 'ENOENT') { // This checks for a simple file not found, and uses the web as a backup source
				console.log('File not found!');
				var url = "http://history.muffinlabs.com/date/" + dayToFind.format("M/D"); // This site doesn't require 0 padding of months or days
				request({
					url: url,
					json: true
				}, function (error, response, body) {
					if (!error && response.statusCode === 200) {
						allEvents = parseEvents(body,dayToFind);
						if (allEvents.events.length > 0 || allEvents.deaths.length > 0 || allEvents.births.length > 0) {
							dfd.resolve({
								events: allEvents.events,
								deaths: allEvents.deaths,
								births: allEvents.births
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
				});	
			}
			else  {
				console.log("Something's gone terrible wrong: ",err);
			}
		}
		else {
			allEvents = parseEvents(JSON.parse(data), dayToFind);
			if (allEvents.events.length > 0 || allEvents.deaths.length > 0 || allEvents.births.length > 0) {
				dfd.resolve({
					events: allEvents.events,
					deaths: allEvents.deaths,
					births: allEvents.births
				});
			}
			else {
				dfd.reject();
			}
		}
	});
	return dfd.promise();
}

function getEvent() {
	var today = moment();
	var landing = moment([1969, 6, 20]);
	var dayInHistory = moment();
	var recentTweets = [];
	var listOfEvents = [];
	var tweeted = false;
	var eventToTweet, composedEventToTweet, splicePoint;
	dayInHistory.subtract(Math.ceil(today.diff(landing, 'days')/2), 'days');
//	dayInHistory.subtract(10, 'days'); // Uncomment and edit this line if you need to move the date around for testing
	retrieveAllEvents(dayInHistory).then(function(returnedListOfEvents) {
		getLastTweet().then(function(recentTweets) {
			listOfEvents = returnedListOfEvents;
			while (listOfEvents.events.length > 0 && tweeted === false) {
				eventToTweet = listOfEvents.events[Math.floor(Math.random() * listOfEvents.events.length)];
				composedEventToTweet = composeTweet(eventToTweet, "Event");
				if (recentTweets.indexOf(composedEventToTweet) >= 0) {
					splicePoint = listOfEvents.events.indexOf(eventToTweet);
					listOfEvents.events.splice(splicePoint,1);
				}
				else {
					tweeted = true;		
					tweetEvent(composedEventToTweet);
				}
			}
			while (listOfEvents.deaths.length > 0 && tweeted === false) {
				eventToTweet = listOfEvents.deaths[Math.floor(Math.random() * listOfEvents.deaths.length)];
				composedEventToTweet = composeTweet(eventToTweet, "Death");
				if (recentTweets.indexOf(composedEventToTweet) >= 0) {
					splicePoint = listOfEvents.deaths.indexOf(eventToTweet);
					listOfEvents.deaths.splice(splicePoint,1);
				}
				else {
					tweeted = true;	
					tweetEvent(composedEventToTweet);
				}
			}
			while (listOfEvents.births.length > 0 && tweeted === false) {
				eventToTweet = listOfEvents.births[Math.floor(Math.random() * listOfEvents.births.length)];
				composedEventToTweet = composeTweet(eventToTweet, "Birth");
				if (recentTweets.indexOf(composedEventToTweet) >= 0) {
					splicePoint = listOfEvents.births.indexOf(eventToTweet);
					listOfEvents.births.splice(splicePoint,1);
				}
				else {
					tweeted = true;
					tweetEvent(composedEventToTweet);
				}
			}
			if (tweeted === false) {
				console.log("I guess there were duplicates today");
			}
		});
	});
}

getEvent(); // Try to retweet something as soon as we run the program...