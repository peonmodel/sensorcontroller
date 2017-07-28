# Package for controlling sensor

## Specifications
- have a list of available ports
- invalid ports, ports that are not sensors are filtered away
- valid ports in a collection that is subscribed to
- ports have status isOpen

- user choose from list of ports to open/connect a port, returns a promise
- opened ports are tracked periodically for its open status
- (how to check that port is open?)

- initialise open port, shows pending & is cancellable & is done-able
- initialise referring to connecting multiple sensors one at a time and giving a UUID
- (how to cancel/time out?)
- (to make things simpler, after connecting the physical sensor, user need to click a button)
- (it would be better not to have to do so, but automatic have issues like how to know to when to send out the ping, the ping needs to be done after its connected)

- send the ping and wait for reply to know that its connected else timeout
- mark as not ready
- assign UUID and wait for reply else...
- ping again with UUID and wait else...
- set ready to connect next / done

- after all connections done

## Pseudo-code

SerialPort > opened port > SensorPort
Sensor

```js
sensor = new Sensor(address)
sensor.parent = sensorPort

PROTOCOLS = {
	changeAddress 
}

sensor.changeAddress = async function(newAddress) {
	const { CHANGE_ADDRESS_SEQUENCE: sequence, expectedReply } = PROTOCOLS.changeAddress(newAddress)
	const response = this.parent.port.sendPromise(CHANGE_ADDRESS_SEQUENCE)
	if (response !== expectedReply) { throw new Meteor.Error('response mismatch') }
	return newAddress;
}
```


```js
SensorPort.sensorCollection = [
	{ address: 105 }
];
SensorPort.readingCollection = [
	{ timestamp, address, reading: 604 }
];

sensorPort.changeAddress = async function(newAddress, oldAddress = 104) {

}

sensorPort.initialiseNewSensor = async function(delay = 500) {
	const detected = await Promise.race([sensorPort.send(104), wait(delay)]);
	if (!detected) { return { expired: true }; }
	const reassigned = await sensorPort.changeAddress(newAddress)
	if (error) { throw new Meteor.Error('unable to change address') }
	const result = { address: reassigned };
	sensorCollection.push(result)
	return result;
}

// timeout 1 min from last successful detection
sensorPort.startScan = async function({limit = 1000, timeoutLimit = 1000*60*1}) {
	sensorPort.shouldScan = true;
	let timer = null;
	let timedOut = false;
	const resetCountdown = () => {
		clearTimeout(timer);
		timer = setTimeout(() => {
			timedOut = true;
		}, timeoutLimit);
	};
	resetCountdown();
	while (sensorPort.shouldScan && limit --> 0 && !timedOut) {
		// there is a delay in initialiseNewSensor already
		const attempt = await sensorPort.initialiseNewSensor();
		if (!attempt.expired) { resetCountdown(); }
	}
	clearTimeout(timer);
	return { manualEnd: !sensorPort.shouldScan, limitReached: limit <= 0, timedOut };
}

sensorPort.endScan = function() {
	sensorPort.shouldScan = false;
}
```

## Initialisation / Setup
```js

// clear ReadingHistory
// to clear Readings Collection from previous sessions
Sensor.clearHistory();

// returns a list of available ports by name
portList = await Sensor.listPorts();

// open port
currentPort = await Sensor.open(portName);

// check port is open
isOpen = await currentPort.isOpen();

// close port
currentPort.close();
```

## Sending
```js
// pause port
currentPort.pause();

// resume port
currentPort.resume();
```
 ## Recording
 ```js
 // start recording stream of readings
 currentPort.record();

 // pause stream of readings
 currentPort.pauseRecord();
 ```