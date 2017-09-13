import { Meteor } from 'meteor/meteor';
import { Sensor } from './sensor.js';

Meteor.publish('sensors', function publishSensors() {
	return [
		Sensor._collection.find(),
		Sensor._readingCollection.find(),
	];
});
