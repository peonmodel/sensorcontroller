import crc from 'crc';

// function fake(subject) {
// 	console.log('subject', subject)
// 	subject.prototype.isFake = true;
// 	return function(...params) {
// 		const item = new subject(...params);
// 		item.test = true;
// 		return item;
// 	};
// }

// @fake
export default class SenseAir {
	constructor(port) {
		this.port = port;
		// if (!port.isOpen()) { throw new Error('port is not open'); }
	}

	// low byte first
	calculateCRC(buffer) {
		const value = crc.crc16modbus(buffer);
		return {
			low: value % 256,
			high: value >> 8
		};
	}

	// check if sequence has valid crc
	isValidCRC(buffer) {
		const length = buffer.length;
		if (length < 4) { return false; }
		const data = omitCRC(buffer);
		const checksum = calculateCRC(data);
		return buffer[length - 1] === checksum.high && buffer[length - 2] === checksum.low;
	}

	// return new buffer without the last 2 bytes
	omitCRC(buffer) {
		return buffer.slice(0, buffer.length - 2);
	}

	// creates valid sequence with crc
	// check bounds for valid address and stuff, make sure quantity is not too high etc
	createRawSequence(address, fnCode, registerAddress, registerQuantity) {
		if (!Number.isInteger(address)) { throw 'invalid address'; }
		if ((1 > address || address > 247) && address !== 254) { throw 'invalid address'; }

		const validFnCode = [3, 4, 6];
		if (!validFnCode.includes(fnCode)) { throw 'invalid code'; }

		if (fnCode === 6) {
			if (registerAddress > 31) { throw 'illegal data address'; }
		} else {
			if (registerAddress > 31 || registerAddress + registerQuantity > 32) { throw 'illegal data address'; }
			if (1 > registerQuantity || registerQuantity > 8) { throw 'illegal data value'; }
		}

		const sequence = [address, fnCode, 0, registerAddress, registerQuantity >> 8, registerQuantity % 256];
		const crc = calculateCRC(sequence);
		return Buffer.from([...sequence, crc.low, crc.high]);
	}

	// TODO: crc

	async readCO2(sensorAddress) {
		const [ address, fn, regAdd, qty ] = [ sensorAddress, 4, 3, 1 ];
		const instruction = createRawSequence(address, fn, regAdd, qty);
		this.port.options.expectedResponseLength = 5 + (qty * 2);  // 5 = add+fn+howmany+crc(2)
		const result = await this.port.writeAndDrainPromise(instruction, { expectsEcho: false });
		const parsed = (result[3] << 8) + result[4];  // << 8 === * 2^8
		console.log(`CO2 readings at ${address} is ${parsed}`);
		return parsed;
	}

	async readSensorStatus(sensorAddress) {
		const [ address, fn, regAdd, qty ] = [ sensorAddress, 4, 0, 1 ];
		const instruction = createRawSequence(address, fn, regAdd, qty);
		this.port.options.expectedResponseLength = 5 + (qty * 2);  // 5 = add+fn+howmany+crc(2)
		const result = await this.port.writeAndDrainPromise(instruction, { expectsEcho: false });
		const parsed = (result[3] << 8) + result[4];  // << 8 === * 2^8
		console.log(`Sensor status at ${address} is ${parsed}`);
		return parsed;
	}

	async readSensorStatusAndCO2(sensorAddress) {
		const [ address, fn, regAdd, qty ] = [ sensorAddress, 4, 0, 4 ];
		const instruction = createRawSequence(address, fn, regAdd, qty);
		this.port.options.expectedResponseLength = 5 + (qty * 2);
		const result = await this.port.writeAndDrainPromise(instruction, { expectsEcho: false });
		const parsed = (result[3] << 8) + result[4];  // << 8 === * 2^8
		const reading = (result[9] << 8) + result[10];
		console.log(`Sensor status at ${address} is ${parsed}, CO2 reading is ${reading}`);
		return parsed;
	}

	async clearAcknowledgementRegister(sensorAddress) {
		const [ address, fn, regAdd, qty ] = [ sensorAddress, 6, 0, 0 ];
		const instruction = createRawSequence(address, fn, regAdd, qty);
		this.port.options.expectedResponseLength = 8;
		const result = await this.port.writeAndDrainPromise(instruction);
		const isEcho = !result.find((val, idx) => val !== instruction[val]);
		console.log(`clearAcknowledgementRegister at ${address} ${isEcho ? 'succeeded': 'failed'}`);
		return isEcho;
	}

	async setCalibration(sensorAddress, value) {
		const [ address, fn, regAdd, qty ] = [ sensorAddress, 6, 1, value ];
		const instruction = createRawSequence(address, fn, regAdd, qty);
		serialPort.options.expectedResponseLength = 8;
		const result = await serialPort.writeAndDrainPromise(instruction);
		const isEcho = !result.find((val, idx) => val !== instruction[val]);
		console.log(`setCalibration at ${address} ${isEcho ? 'succeeded': 'failed'}`);
		return isEcho;
	}

	async readAcknowledgementRegister(sensorAddress) {
		const [ address, fn, regAdd, qty ] = [ sensorAddress, 3, 0, 1 ];
		const instruction = createRawSequence(address, fn, regAdd, qty);
		this.port.options.expectedResponseLength = 5 + (qty * 2);  // 5 = add+fn+howmany+crc(2)
		const result = await this.port.writeAndDrainPromise(instruction, { expectsEcho: false });
		const parsed = (result[3] << 8) + result[4];  // << 8 === * 2^8
		console.log(`AcknowledgementRegister at ${address} is ${parsed}`);
		return parsed;
	}

	async calibrateBackground(sensorAddress, value) {
		await clearAcknowledgementRegister(sensorAddress);
		await setCalibration(sensorAddress, value);
		await this.port._timeoutPromise(2000);
		const isDone = await readAcknowledgementRegister(sensorAddress) === 32;
		console.log(`calibration status: ${isDone ? 'success' : 'fail'}`);
		return isDone;
	}

	async readABC(sensorAddress) {
		const [ address, fn, regAdd, qty ] = [ sensorAddress, 3, 31, 1 ];
		const instruction = createRawSequence(address, fn, regAdd, qty);
		this.port.options.expectedResponseLength = 5 + (qty * 2);
		const result = await this.port.writeAndDrainPromise(instruction);
		const parsed = (result[3] << 8) + result[4];  // << 8 === * 2^8
		console.log(`ABC readings at ${address} is ${parsed}`);
		return parsed;
	}

	async setABC(sensorAddress, value) {
		const [ address, fn, regAdd, qty ] = [ sensorAddress, 6, 31, value ];
		const instruction = createRawSequence(address, fn, regAdd, qty);
		this.port.options.expectedResponseLength = 8;
		const result = await this.port.writeAndDrainPromise(instruction);
		const isEcho = !result.find((val, idx) => val !== instruction[val]);
		console.log(`setABC at ${address} to ${value} ${isEcho ? 'succeeded': 'failed'}`);
		return isEcho;
	}

	// calibration
	// wait 2 second due to measurement freq
}
