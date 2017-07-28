import { Sensor, SensorPort } from './sensor.js';

Meteor.publish('sensors', function() {
	return [
		Sensor._collection.find(),
		Sensor._readingCollection.find(),
	];
});
