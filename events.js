var _ = require('underscore.deferred');
var fs = require('fs');

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

exports.retrieveAllEvents = function(dayToFind) {
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
