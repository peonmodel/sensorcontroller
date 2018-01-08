import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Random } from 'meteor/random';
import SerialPort from 'serialport';
import crc from 'crc';
import lodash from 'lodash';

const DEFAULT_ADDRESS = 104;
const PUBLIC_ADDRESS = 254;
const CALIBRATION_ACK = 32;
const RETRIAL_ATTEMPTS = 10;  // flush/drain each time
const RESPONSE_TIMEOUT = 300;

// function stub(value) {
// 	return function decorator(target, key, descriptor) {
// 		// target = instance of the class
// 		// key is the method name
// 		if (typeof value === 'function') {
// 			descriptor.value = value;
// 		} else {
// 			descriptor.value = function() {
// 				return value;
// 			};
// 		}
// 	};
// }

const Utils = {
	removeLast2(buffer) {
		return buffer.slice(0, buffer.length - 2);
	},
	calculateCRC(buffer) {
		const [b1, b2, a1, a2] = crc.crc16modbus(buffer).toString(16).padStart(4, '0');
		return [a1, a2, b1, b2].join('');
	},
	isValidCRC(buffer) {
		if (!buffer || !buffer.length) { return false; }
		const length = buffer.length;
		if (length < 4) { return false; }
		const data = Utils.removeLast2(buffer);
		const checksum = Utils.calculateCRC(data);
		// console.log('calculated checksum', checksum)
		return buffer.toString('hex', buffer.length - 2, buffer.length) === checksum;
	},
	isEcho(response, buffer) {
		if (buffer.length !== response.length) { return false; }
		for (let ii = 0; ii < buffer.length; ++ii) {
			if (buffer[ii] !== response[ii]) { return false; }
		}
		return true;
	},
	parseData(buffer) {
		if (!buffer || buffer.length < 5) { return null; }
		const parsed = (buffer[3] << 8) + buffer[4];
		return parsed;
	}
};

const PROTOCOLS = {
	generateChangeAddress(address, value) {
		const sensorAddress = address.toString(16);
		const fnCode = '41';  // ???
		const	registerAddress = '000001';
		const	registerQuantity = value.toString(16);
		let sequence = new Buffer(`${sensorAddress}${fnCode}${registerAddress}${registerQuantity}`, 'hex');
		const checksum = Utils.calculateCRC(sequence);
		sequence = new Buffer(`${sensorAddress}${fnCode}${registerAddress}${registerQuantity}${checksum}`, 'hex');
		return {
			sequence,
			isExpected: (response) => { return Utils.isEcho(response, new Buffer(`FE4181E0`, 'hex')); },
		};
	},
	generateSaveAddress(address) {
		const sensorAddress = address.toString(16);
		const fnCode = '41';  // ???
		const	registerAddress = '0060';
		const	registerQuantity = '0102';
		let sequence = new Buffer(`${sensorAddress}${fnCode}${registerAddress}${registerQuantity}`, 'hex');
		const checksum = Utils.calculateCRC(sequence);
		sequence = new Buffer(`${sensorAddress}${fnCode}${registerAddress}${registerQuantity}${checksum}`, 'hex');
		return {
			sequence,
			isExpected: (response) => { return Utils.isEcho(response, new Buffer(`FE4181E0`, 'hex')); },
		};
	},
	generateRestartSensor(address) {
		const sensorAddress = address.toString(16);
		const fnCode = '41';  // ???
		const	registerAddress = '0060';
		const	registerQuantity = '01FF';
		let sequence = new Buffer(`${sensorAddress}${fnCode}${registerAddress}${registerQuantity}`, 'hex');
		const checksum = Utils.calculateCRC(sequence);
		sequence = new Buffer(`${sensorAddress}${fnCode}${registerAddress}${registerQuantity}${checksum}`, 'hex');
		return {
			sequence,
			isExpected: (response) => { return Utils.isEcho(response, new Buffer(`FE4181E0`, 'hex')); },
		};
	},
	generateReadCO2(address) {
		const sensorAddress = address.toString(16);
		const fnCode = '04';
		const	registerAddress = '0003';
		const	registerQuantity = '0001';
		let sequence = new Buffer(`${sensorAddress}${fnCode}${registerAddress}${registerQuantity}`, 'hex');
		const checksum = Utils.calculateCRC(sequence);
		sequence = new Buffer(`${sensorAddress}${fnCode}${registerAddress}${registerQuantity}${checksum}`, 'hex');
		return {
			sequence,
			isExpected: (response) => { return Utils.isValidCRC(response); },
		};
	},
	generateSetABC(address, value) {
		const sensorAddress = address.toString(16);
		const fnCode = '06';
		const	registerAddress = '001f';
		const	registerQuantity = value.toString(16);
		let sequence = new Buffer(`${sensorAddress}${fnCode}${registerAddress}${registerQuantity}`, 'hex');
		const checksum = Utils.calculateCRC(sequence);
		sequence = new Buffer(`${sensorAddress}${fnCode}${registerAddress}${registerQuantity}${checksum}`, 'hex');
		return {
			sequence,
			isExpected: (response) => { return Utils.isEcho(response, sequence); },
		};
	},
	generateReadABC(address) {
		const sensorAddress = address.toString(16);
		const fnCode = '03';
		const	registerAddress = '001f';
		const	registerQuantity = '01';
		let sequence = new Buffer(`${sensorAddress}${fnCode}${registerAddress}${registerQuantity}`, 'hex');
		const checksum = Utils.calculateCRC(sequence);
		sequence = new Buffer(`${sensorAddress}${fnCode}${registerAddress}${registerQuantity}${checksum}`, 'hex');
		return {
			sequence,
			isExpected: (response) => { return Utils.isValidCRC(response, sequence); },
		};
	},
	generateClearAcknowledgementRegister(address) {
		const sensorAddress = address.toString(16);
		const fnCode = '06';
		const	registerAddress = '0000';
		const	registerQuantity = '0000';
		let sequence = new Buffer(`${sensorAddress}${fnCode}${registerAddress}${registerQuantity}`, 'hex');
		const checksum = Utils.calculateCRC(sequence);
		sequence = new Buffer(`${sensorAddress}${fnCode}${registerAddress}${registerQuantity}${checksum}`, 'hex');
		return {
			sequence,
			isExpected: (response) => { return Utils.isEcho(response, sequence); },
		};
	},
	generateReadAcknowledgementRegister(address) {
		const sensorAddress = address.toString(16);
		const fnCode = '03';
		const	registerAddress = '0000';
		const	registerQuantity = '0001';
		let sequence = new Buffer(`${sensorAddress}${fnCode}${registerAddress}${registerQuantity}`, 'hex');
		const checksum = Utils.calculateCRC(sequence);
		sequence = new Buffer(`${sensorAddress}${fnCode}${registerAddress}${registerQuantity}${checksum}`, 'hex');
		return {
			sequence,
			isExpected: (response) => { return Utils.isValidCRC(response); },
		};
	},
	generateBackgroundCalibration(address, value) {
		// const sensorAddress = address.toString(16);
		// const fnCode = '06';
		// const	registerAddress = '001f';
		// const	registerQuantity = value.toString(16);
		// let sequence = new Buffer(`${sensorAddress}${fnCode}${registerAddress}${registerQuantity}`, 'hex');
		// const crc = Utils.calculateCRC(sequence);
		// sequence = new Buffer(`${sensorAddress}${fnCode}${registerAddress}${registerQuantity}${crc}`, 'hex');
		// return {
		// 	sequence,
		// 	isExpected: (response) => { return Utils.isEcho(response, sequence); },
		// };
	},
	generateReadZeroTrim(address) {

	},
	generateSetZeroTrim(address, value) {

	},
	generateSetZeroTrimEEPROM(address) {

	},
	generateSoftReset(address) {

	},
};
// 105,106,107,108,109,110,111,112
export class Sensor {
	constructor(item, parent) {
		Object.assign(this, item);
		this.readings = this.readings || [];
		this.parent = parent;
	}

	parent = null

	async _changeAddress(newAddress) {
		const { sequence, isExpected } = PROTOCOLS.generateChangeAddress(this.address, newAddress);
		return this.retrial(sequence, isExpected);
	}

	async _saveAddress() {
		const { sequence, isExpected } = PROTOCOLS.generateSaveAddress(this.address);
		return this.retrial(sequence, isExpected);
	}

	async _restartSensor() {
		const { sequence, isExpected } = PROTOCOLS.generateRestartSensor(this.address);
		return this.retrial(sequence, isExpected);
	}

	async changeAddress(newAddress) {
		console.log('changing', this.address, newAddress);
		const res1 = await this._changeAddress(newAddress);
		console.log('res1', res1);
		const res2 = await this._saveAddress();
		console.log('res2', res2);
		const res3 = await this._restartSensor();
		console.log('res3', res3);
		this.address = newAddress;
		await Sensor.collection.updateOne({ _id: this._id }, { $set: { address: newAddress } });
		console.log(`address changed ${this.address}`);
	}

	async retrial(sequence, isExpected, limit = RETRIAL_ATTEMPTS) {
		let attemptCount = 0;
		do {
			const { result, data } = await this.parent.send(sequence);
			await this.parent.flush();
			console.log('response', data)
			if (isExpected(data)) { return { result, data }; }
			attemptCount += 1;
		} while (attemptCount <= limit);
		return null;
	}
	// only read CO2
	// @stub(() => { const value = Math.ceil(Math.random() * 256); return { result: 'success', data: new Buffer(`${'FE0300'}${value.toString(16)}${'01AAAA'}`, 'hex') }; })
	async _readCO2() {
		const { sequence, isExpected } = PROTOCOLS.generateReadCO2(this.address);
		return this.retrial(sequence, isExpected);
	}

	// reads CO2 and record in collection
	async readCO2() {
		const obj = await this._readCO2();  // { result: 'success', data: new Buffer() }
		if (!obj) {
			Sensor.readingCollection.insertOne({ _id: Random.id(), portName: this.portName, address: this.address, value: null, timestamp: new Date() });
			return null;
		}
		const { result, data } = obj;
		const parsedData = Utils.parseData(data);
		console.log('read', parsedData);
		// no need to await the below promise
		Sensor.readingCollection.insertOne({ _id: Random.id(), portName: this.portName, address: this.address, value: parsedData, timestamp: new Date() });
		return { result, data, parsedData };
	}

	async readZeroTrim() {
		const { sequence, isExpected } = PROTOCOLS.generateReadZeroTrim(this.address);
		return this.retrial(sequence, isExpected);
	}

	async calibrateCO2(current = 400) {
		let zeroTrim = await this.readZeroTrim();
		let data = await this._readCO2();
		let co2Value = Utils.parseData(data.data);
		const retrialsLimit = 10;
		let trialCount = 1;
		while (trialCount > retrialsLimit) {
			// formula to get trim value
			// newTrim = fn(co2Value)
			// this.setTrimValue(newTrim)
			// read again
			// if ok, store EEPROM and return
		}
	}

	async readAcknowledgementRegister() {
		const { sequence, isExpected } = PROTOCOLS.generateReadAcknowledgementRegister(this.address);
		const { result, data } = await this.parent.send(sequence);
		if (!isExpected(data)) { return null; }
		const parsedData = Utils.parseData(data) === CALIBRATION_ACK;
		// no need to await the below promise
		return { result, data, parsedData };
	}

	async clearAcknowledgementRegister() {
		const { sequence, isExpected } = PROTOCOLS.generateClearAcknowledgementRegister(this.address);
		const { data } = await this.parent.send(sequence);
		return isExpected(data);
	}

	async calibrateBackground() {}

	async ping() {
		return this.readCO2();
	}
}
Sensor._collection = new Mongo.Collection('sensors', { defineMutationMethods: false });
Sensor.collection = Sensor._collection.rawCollection();
Sensor._readingCollection = new Mongo.Collection('readings', { defineMutationMethods: false });
Sensor.readingCollection = Sensor._readingCollection.rawCollection();

export class SensorPort {

	constructor(portName) {
		this.portName = portName;
		this.port = new SerialPort(portName, {
			autoOpen: false,
			baudrate: 9600,
			parser: (emitter, buffer) => {
				// let keep things simple and assume everything is alright, no malformed response buffer
				emitter.emit('data', buffer);
			}
		});
		this.port.on('data', (data) => {
			this.awaitingResponse = false;
			lodash.each(this.responseCallbacks, fn => {
				if (typeof fn === 'function') { fn(undefined, data); }
			});
			this.responseCallbacks = {};
		});
		this.port.on('error', (error) => {
			this.awaitingResponse = false;
			console.log('port error', error);
			lodash.each(this.responseCallbacks, fn => {
				if (typeof fn === 'function') { fn(error, undefined); }
			});
			this.responseCallbacks = {};
		});
	}

	responseCallbacks = {}
	awaitingResponse = false
	busy = false
	shouldScan = false
	shouldReadLoop = false
	sensors = []

	get freeAddress() {
		for (let ii = DEFAULT_ADDRESS + 1; ii < 254; ++ii) {
			if (!this.sensors.find(o => o.address === ii)) { return ii; }
		}
		console.warn('ran out of free address (105 - 253)');
		return 0;
	}

	static async listPorts() {
		return new Promise((resolve, reject) => {
			SerialPort.list((error, ports) => {
				if (error) {
					reject(error);
				} else {
					resolve(ports);
				}
			});
		});
	}

	static async wait(timeout) {
		return new Promise(resolve => {
			setTimeout(resolve, timeout, { result: 'timedout' });
		});
	}

	async wait(timeout = RESPONSE_TIMEOUT) {
		return new Promise(resolve => {
			setTimeout(resolve, timeout, { result: 'timedout' });
		});
	}

	async open(...params) {
		if (this.port.isOpen()) { return true; }
		return new Promise((resolve, reject) => {
			this.port.open(...params, (error, result) => {
				if (error) {
					reject(error);
				} else {
					resolve(result || 'opened');
				}
			});
		});
	}

	async close(...params) {
		if (!this.port.isOpen()) { return 'closed'; }
		return new Promise((resolve, reject) => {
			this.port.close(...params, (error, result) => {
				if (error) {
					reject(error);
				} else {
					resolve(result || 'closed');
				}
			});
		});
	}

	async flush(...params) {
		return new Promise((resolve, reject) => {
			this.port.flush(...params, (error, result) => {
				if (error) {
					reject(error);
				} else {
					resolve(result);
				}
			});
		});
	}

	async drain(...params) {
		return new Promise((resolve, reject) => {
			this.port.drain(...params, (error, result) => {
				if (error) {
					reject(error);
				} else {
					resolve(result);
				}
			});
		});
	}

	async write(...params) {
		return new Promise((resolve, reject) => {
			this.port.write(...params, (error, result) => {
				if (error) {
					reject(error);
				} else {
					resolve(result);
				}
			});
		});
	}

	async send(...params) {
		if (this.awaitingResponse) { throw new Meteor.Error('port is busy'); }
		this.awaitingResponse = true;
		await Promise.all([this.drain(), this.flush()]);
		await this.write(...params);
		let callbackId = null;
		const responsePromise = new Promise((resolve, reject) => {
			callbackId = this.registerCallback((error, result) => {
				if (error) {
					reject(error);
				} else {
					resolve({ result: 'success', data: result });
				}
			});
		});
		return Promise.race([responsePromise, this.wait()]).then(result => {
			this.awaitingResponse = false;
			this.unregisterCallback(callbackId);
			return result;
		});
	}

	// @stub(() => { const value = Math.ceil(Math.random() * 256); return { result: 'success', data: new Buffer(`${'FE0300'}${value.toString(16)}${'01AAAA'}`, 'hex') }; })
	async ping(address) {
		const { sequence, isExpected } = PROTOCOLS.generateReadCO2(address);
		const { result, data } = await this.send(sequence);
		const parsedData = Utils.parseData(data);
		if (!isExpected(data)) { return null; }
		return { result, data, parsedData };
	}

	registerCallback(fn) {
		const id = Meteor.uuid();
		this.responseCallbacks[id] = fn;
		return id;
	}

	unregisterCallback(id) {
		delete this.responseCallbacks[id];
	}

	async registerSensor(address) {
		// check that sensor is not already in array
		let sensor = this.sensors.find(o => o.address === address);
		if (sensor) { return null; }  // dont repeat
		// pings address to verify presence
		const response = await this.ping(address);
		if (!response) { return null; }
		await Sensor.collection.insertOne({ _id: Random.id(), portName: this.portName, address });
		sensor = await Sensor.collection.findOne({ address });
		sensor = new Sensor(sensor, this);
		sensor && this.sensors.push(sensor);
		return sensor;
	}

	// register sensors of address
	async registerSensors(addresses) {
		const array = [];
		for (const address of addresses) {
			const sensor = await this.registerSensor(address);
			// console.log('registerSensors', sensor && sensor.address || null);
			array.push(sensor);
		}
		return array;
	}

	async readCO2All() {
		// console.log('readCO2All');
		for (const sensor of this.sensors) {
			await sensor.readCO2();
		}
		return this.sensors.map(({address, readings}) => ({ address, readings }));
	}

	static async pingRange(range = []) {
		for (const address of range) {
			const response = await this.ping(address);
			// console.log('pingRange', response);
		}
	}

	async initialiseNewSensor(delay = 500) {
		const { result } = this.registerSensor(DEFAULT_ADDRESS);
		if (result !== 'success') { return { expired: true }; }
		const newAddress = await this.changeAddress(this.freeAddress);
		if (!newAddress) { return null; }
		return newAddress;
	}

	// timeout 1 min from last successful detection
	async startScan({limit = 1000, timeoutLimit = 1 * 60 * 1000} = {}) {
		this.shouldScan = true;
		let timer = null;
		let timedOut = false;
		const resetCountdown = () => {
			clearTimeout(timer);
			timer = setTimeout(() => {
				timedOut = true;
			}, timeoutLimit);
		};
		resetCountdown();
		while (this.shouldScan && limit-- > 0 && !timedOut) {
			// there is a delay in initialiseNewSensor already
			const attempt = await this.initialiseNewSensor();
			if (!attempt) { resetCountdown(); }
		}
		clearTimeout(timer);
		return { manualEnd: !this.shouldScan, limitReached: limit <= 0, timedOut };
	}

	endScan() {
		this.shouldScan = false;
	}

	async resetAll() {
		this.busy = true;
		for (const sensor of this.sensors) {
			const result = await sensor.changeAddress(DEFAULT_ADDRESS);
			if (result) { sensor.remove = true; }  // mark for remove
		}
		this.sensors = this.sensors.filter(o => !o.remove);  // keep those that are not marked removed
		await Sensor.collection.deleteMany({ address: DEFAULT_ADDRESS });
		this.busy = false;
	}

	// it takes 2 seconds for new readings
	async startReadLoop({ interval = 2000 } = {}) {
		this.shouldReadLoop = true;
		console.log('startReadLoop');
		while (this.shouldReadLoop) {
			await this.readCO2All();
			await this.wait(interval);
			console.log('reading loop');
		}
		return { manualEnd: true };
	}

	endReadLoop() {
		this.shouldReadLoop = false;
	}
}
