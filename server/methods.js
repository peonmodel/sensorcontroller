import SerialPort from 'serialport';
import SenseAir from './senseair.js';
import { SensorPort, Sensor } from './sensor.js';

// promisify port methods
['open', 'close', 'flush', 'drain', 'write', 'read'].forEach(fn => {
  SerialPort.prototype[`${fn}Promise`] = function(...params) {
    return new Promise((resolve, reject) => {
      this[fn](...params, (error, result) => {
        if (error) {
					reject(error);
				} else {
					resolve(result);
				}
      })
    });
  }
});

function promiseTimeout(time) {
	return new Promise((resolve) => {
		setTimeout(resolve, time);
	});
}

/**
 * promisifyCall - function to wrap async Meteor functions into returning promises
 *
 * @param  {Function} fn - async function to wrap
 * @param  {Array} params - array of params
 * @returns {Promise}           resolve if success
 */
function promisifyCall(fn, ...params) {
	return new Promise((resolve, reject) => {
		fn(...params, (err, res) => {
			if (err) { return reject(err); }
			return resolve(res);
		});
	});
}

let currentSensorPort = null;

Meteor.methods({
  listPorts: function listPorts() {
    return SensorPort.listPorts();
  },
  isOpen: async function isOpen() {
    if (!currentSensorPort) { return false; }
    return currentSensorPort.port.isOpen();
  },
  openPort: async function openPort(portName) {
    if (!currentSensorPort) {
      currentSensorPort = new SensorPort(portName);
    } else if (currentSensorPort.portName !== portName) {
      await currentSensorPort.close();
      currentSensorPort = new SensorPort(portName);
    }
    const result =  await currentSensorPort.open();
    return result;
  },
  closePort: async function closePort(portName) {
    if (!currentSensorPort) { return true; }
    const result =  await currentSensorPort.close();
    currentSensorPort = null;
    return result;
  },
  registerSensors: async function registerSensors(addresses = []) {
    return await currentSensorPort.registerSensors(addresses);
  },
  readCO2All: async function readCO2All() {
    return currentSensorPort.readCO2All();
  },
  readCO2(address) {
    const sensor = currentSensor.sensors.find(o => o.address === address);
    return sensor.readCO2;
  },
});