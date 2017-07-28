import { Meteor } from 'meteor/meteor';
import './methods.js';
import { SensorPort, Sensor } from './sensor.js';
import './publications.js';
// import SerialPort from 'serialport';
// import { Mongo } from 'meteor/mongo';

// const Readings = new Mongo.Collection('SerialReadings');
// const PortList = new Mongo.Collection('PortList');

// let currentPort = null;

Meteor.startup(() => {
  Sensor.collection.remove({});
  Sensor.readingCollection.remove({});
  // code to run on server at startup
});

// const serialPort = new SerialPort.SerialPort('/dev/cu.usbserial', {
// 	baudrate: 9600,
// 	// buffersize: 7,
//   parser: SerialPort.parsers.byteLength(7),
// });

// SerialPort.list(function (err, ports) {
//   ports.forEach(function(port) {
//     console.log(port.comName);
//   });
// });

// serialPort.on('error', function(err) {
//     console.log('Port error', err);
// });

// serialPort.on('open', function() {
//     console.log('Port open');
// });

// // REFERENCE: http://stackoverflow.com/questions/9499854/node-js-serialport-module-event-types
// // Change parser of serial port to emit different events

// // may unregister event by: serialPort._events.data == Array of functions 

// var boundcallback = Meteor.bindEnvironment(function(res){
// 	var value = res[3]*256 + res[4];
// 	console.log(value)
// 	Reading.insert({value: value});
// });
// //receive data
// serialPort.on('data', function(data) {
// 	console.log(data)
// 	boundcallback(data)
// });

// serialPort.on('close', function() {
//     console.log('on closed');
// });

// if(Meteor.isServer){
// 	Meteor.publish("tasks", function(){
// 		return Tasks.find({
// 			$or: [
// 				{private: {$ne: true}},
// 				{ owner: this.userId}
// 			]
// 		});
// 	});
	
// 	Meteor.publish("images", function(){
// 		return Images.find({}, {
// 			limit: 1,
// 			sort: {
// 				timestamp: -1
// 			}
// 		});
// 	});
	
// 	Meteor.publish('dupe1', function(){
// 		return DupeTest.find({
// 			$or: [{dupe: 1}, {common: true}],
// 		},{
// 			fields: {field1: 0}
// 		});
// 	});
	
// 	Meteor.publish('dupe2', function(){
// 		return DupeTest.find({
// 			$or: [{dupe: 2}, {common: true}],
// 		},{
// 			fields: {field2: 0}
// 		});
// 	});
	
// 	Meteor.publish("reading", function(){
// 		return Reading.find();
// 	});
// }

// Meteor.methods({
// 	addTask: function(text){
// 		if(!Meteor.userId()) {
// 			throw new Meteor.Error("not-authorized");
// 		}
// 		Tasks.insert({
// 			text: text,
// 			createdAt: new Date(),
// 			owner: Meteor.userId(),
// 			username: Meteor.user().username
// 		});
// 	},
// 	deleteTask: function(taskId){
// 		var task = Tasks.findOne(taskId);
// 		if(task.private && tasks.owner !== Meteor.userId()){
// 			throw new Meteor.Error("not-authorized");
// 		}
// 		Tasks.remove(taskId);
// 	},
// 	setChecked: function(taskId, setChecked){
// 		var task = Tasks.findOne(taskId);
// 		if(task.private && tasks.owner !== Meteor.userId()){
// 			throw new Meteor.Error("not-authorized");
// 		}
// 		Tasks.update(taskId, {$set:{checked: setChecked}});
// 	},
// 	setPrivate: function(taskId, setToPrivate){
// 		var task = Tasks.findOne(taskId);
// 		if(task.owner !== Meteor.userId()){
// 			throw new Meteor.Error("not-authorized");
// 		}
// 		Tasks.update(taskId, {$set:{ private:setToPrivate}});
// 	},
	
// 	addImage: function(URI){
// 		Images.insert({
// 			URI: URI,
// 			timestamp: new Date()
// 		});
// 	},
// 	readSensor: function(){
// 		this.unblock();
// 		console.log('read')
// 		//0xFE, 04, 00, 03, 00, 01, D5, C5
// 		// var b = new Buffer(8);
// 		// b.writeUIntBE(0xfe0400030001d5c5, 0, 8);
// 		var b = new Buffer('fe0400030001d5c5', "hex");
// 		//var message = new Buffer([104])
		
// 		serialPort.write(b, function callback(err){
// 			if (err){
// 				console.log('error writing', err);
// 			} else {
// 				serialPort.drain(function callback(err){
// 					if (err){
// 						console.log('error draining', err)
// 					} else {
// 						console.log('finished writing');
// 					}
					
// 				})
// 			}
// 		});
		
		
// 		//onReceive(boundcallback);
// 		//future.wait();
// 	},
// 	openPort: function(){
// 		this.unblock();
// 		console.log('open')
// 		serialPort.open(function(err) {
// 			if (err){
// 				console.log(err)
// 			}
// 			// else {
// 			// 	console.log('opened')
// 			// 	serialPort.resume();
// 			// }
// 		});
// 	},
// 	pausePort: function(){
// 		this.unblock();
// 		serialPort.pause();
// 	},
// 	resumePort: function(){
// 		this.unblock();
// 		serialPort.resume();
// 	},
// 	// port closing is buggy, some blocking thingy
// 	closePort: function(){
// 		this.unblock();
// 		console.log('close')
// 		serialPort.close(function(err, res) {
// 			console.log('Port closed', err, res);
// 		});
// 	},
// 	isOpen: function(){
// 		//console.log(serialPort)
// 		// serialPort.options.parser = SerialPort.parsers.byteLength(7)
// 		console.log('port is opened: ', serialPort.isOpen())
// 		//Reading.remove({});
// 	},
// });