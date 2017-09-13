import React from 'react';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { render } from 'react-dom';
import reactify from '../imports/reactive-decorator.js';
import promisifyCall from '../imports/promisifycall.js';
import _ from 'lodash';
import moment from 'moment';

const DEFAULT_STRING = ''.padEnd(40, '-');
const DEFAULT_OPTION = { comName: DEFAULT_STRING };
const Sensors = new Mongo.Collection('sensors');
window.Sensors = Sensors;
const Readings = new Mongo.Collection('readings');
window.Readings = Readings;
moment.relativeTimeThreshold('ss', 1);
moment.relativeTimeThreshold('s', 60);

function sensorMapper(props, onData) {
	const activeSub = Meteor.subscribe('sensors');
	if (activeSub.ready()) {
		console.log('sub ready')
		onData(null, {
			ready: true,
			sensors: Sensors.find({ portName: props.portName }).fetch(),
		});
	} else {
		onData(null, { ready: false });
	}
}

function readingMapper(props, onData) {
	onData(null, {
		ready: true,
		readings: Readings.find({ address: props.address }, { sort: { timestamp: -1 } }).fetch(),
	});
}

class LiveStamp extends React.PureComponent {
	state = { time: null }
	constructor(props) {
		super(props);
		this.timerId = setInterval(() => {
			this.updateTime();
		}, 1000);
	}
	componentWillUnmount() {
		clearInterval(this.timerId);
	}
	componentWillReceiveProps() {
		this.updateTime();
	}
	updateTime = () => {
		const newStamp = moment(this.props.timestamp).fromNow();
		if (newStamp !== this.state.time) {
			this.setState({ time: newStamp });
		}
	}
	render() {
		return (
			<span>{this.state.time}</span>
		);
	}
}

@reactify(readingMapper)
class Sensor extends React.Component {

	state = { value: null, busy: false, message: '', newAddress: null }

	handleReadCO2Click = async () => {
		this.setState({ busy: true });
		try {
			const result = await promisifyCall(Meteor.call, `readCO2`, this.props.address);
			this.setState({ value: result });
		} catch (error) {
			this.setState({ message: 'error reading' });
		} finally {
			this.setState({ busy: false });
		}
	}

	handleChangeAddressInputChange = (event) => {
		const value = event.target.value;
		this.setState({ newAddress: parseInt(value, 10) });
	}

	handleChangeAddressClick = async () => {
		const newAddress = this.state.newAddress;
		if (!Number.isInteger(newAddress) || newAddress < 1 || newAddress > 253) {
			console.error('invalid address');
		} else {
			await promisifyCall(Meteor.call, `changeAddress`, this.props.address, newAddress);
		}
	}

	render() {
		const { address, readings } = this.props;
		const { value, busy, message } = this.state;
		// const readings = Readings.find({ address }, { sort: { timestamp: -1 } });
		const lastReading = readings[0] || {};
		return (
			<tr>
				<td>{ address } / { address.toString(16).toUpperCase() }</td>
				<td>{ lastReading.value }</td>
				<td><LiveStamp timestamp={lastReading.timestamp}/></td>
				<td>{ message }</td>
				<td><button onClick={this.handleReadCO2Click}>Read CO<sub>2</sub></button></td>
				<td><input onChange={this.handleChangeAddressInputChange}/><button onClick={this.handleChangeAddressClick}>Change address</button></td>
			</tr>
		);
	}
}

@reactify(sensorMapper)
class PortComponent extends React.Component {

	state = { isScanning: false, message: '', busy: false, addresses: '' }

	handleScanSensorClick = async () => {
		this.setState({ message: 'scanning' });
		try {
			const result = await promisifyCall(Meteor.call, `startScan`);
			console.log('handleScanSensorClick', result);
			this.setState({
				message: 'scan ended'
			});
		} catch (error) {
			console.log(error);
			this.setState({ message: error.message || error.error || error });
		}
	}

	handleEndScanClick = async () => {
		try {
			const result = await promisifyCall(Meteor.call, `test2`);
			console.log('handleEndScanClick', result);
		} catch (error) {
			console.log(error);
			this.setState({ message: error.message || error.error || error });
		}
	}

	handleRegisterSensorsClick = async () => {
		this.setState({ busy: true });
		const addresses = this.state.addresses.split(',').map(o => parseInt(o, 10));
		try {
			const result = await promisifyCall(Meteor.call, `registerSensors`, addresses);
			console.log('handleRegisterSensorsClick', result);
			this.setState({
				message: 'registration ended'
			});
		} catch (error) {
			console.log(error);
			this.setState({ message: error.message || error.error || error });
		} finally {
			this.setState({ busy: false });
		}
	}

	handleReadCO2AllClick = async () => {
		this.setState({ busy: true });
		try {
			const result = await promisifyCall(Meteor.call, `readCO2All`);
			console.log('handleReadCO2AllClick', result);
		} catch (error) {
			console.log(error);
			this.setState({ message: error.message || error.error || error });
		} finally {
			this.setState({ busy: false });
		}
	}

	handleStartReadLoopClick = async () => {
		this.setState({ busy: true });
		try {
			await promisifyCall(Meteor.call, `startReadLoop`);
			console.log('started read loop')
		} catch (error) {
			this.setState({ message: error.message || error.error || error });
		} finally {
			this.setState({ busy: false });
		}
	}

	handleEndReadLoopClick = async () => {
		this.setState({ busy: true });
		try {
			await promisifyCall(Meteor.call, `endReadLoop`);
			console.log('ended read loop')
		} catch (error) {
			this.setState({ message: error.message || error.error || error });
		} finally {
			this.setState({ busy: false });
		}
	}

	handleAddressesChange = (event) => {
		this.setState({ addresses: event.target.value });
	}

	handleResetAllClick = async () => {
		await promisifyCall(Meteor.call, `resetAll`);
	}

	render() {
		const { portName, ready, sensors } = this.props;
		const { isScanning, message } = this.state;
		if (!ready) { return (<div>Not ready</div>); }
		return (
			<div>
				<br/>
				<span>Selected port name: {portName || '<Not open port selected>'}</span> <span>Message: {message}</span>
				<br/>
				<button disabled={isScanning} name="scanSensor" onClick={this.handleScanSensorClick}>Scan for new sensors</button>
				<button disabled={!isScanning} name="endScan" onClick={this.handleEndScanClick}>End scan</button>
				<button onClick={this.handleRegisterSensorsClick}>Register Sensors</button>
				<button onClick={this.handleReadCO2AllClick}>Read All CO2</button>
				<button onClick={this.handleStartReadLoopClick}>Start Read Loop</button>
				<button onClick={this.handleEndReadLoopClick}>End Read Loop</button>
				<br/>
				<input name="addresses" onChange={this.handleAddressesChange}/>
				<br/>
				<button onClick={this.handleResetAllClick}>Reset all</button>
				<br/>
				<table>
					<thead>
						<tr>
							<th>Address</th>
							<th>Last valid reading</th>
							<th>Timestamp</th>
							<th>Remarks</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{sensors.map((o, idx) => {
							return (<Sensor key={idx} {...o} />);
						})}
					</tbody>
				</table>
			</div>
		);
	}
}

class App extends React.Component {

	state = { selectedPort: '', availablePorts: [DEFAULT_OPTION], message: '', busy: false, isPortOpen: false }

	handleListPortClick = async () => {
		if (this.state.busy) { return; }
		this.setState({ busy: true, message: '' });
		try {
			const ports = await promisifyCall(Meteor.call, `listPorts`);
			this.setState({
				availablePorts: [DEFAULT_OPTION, ...ports],
				message: 'listed ports'
			});
		} catch (error) {
			this.setState({ message: error.message || error.error || error });
		} finally {
			this.setState({ busy: false });
		}
	}

	handleOpenPortClick = async () => {
		if (this.state.busy) { return; }
		this.setState({ busy: true, message: '' });
		try {
			const result = await promisifyCall(Meteor.call, `openPort`, this.state.selectedPort);
			this.setState({
				isPortOpen: true,
				message: `port ${this.state.selectedPort} opened`
			});
		} catch (error) {
			console.log(error);
			this.setState({ message: `cannot open port ${this.state.selectedPort}` });
		} finally {
			this.setState({ busy: false });
		}
	}

	handleClosePortClick = async () => {
		if (this.state.busy) { return; }
		this.setState({ busy: true, message: '' });
		try {
			const result = await promisifyCall(Meteor.call, `closePort`, this.state.selectedPort);
			this.setState({
				isPortOpen: false,
				message: `port ${this.state.selectedPort} closed`,
				selectedPort: DEFAULT_STRING,
			});
		} catch (error) {
			console.log(error);
			this.setState({ message: error.message || error.error || error });
		} finally {
			this.setState({ busy: false });
		}
	}

	handlePortChange = async (event, element) => {
		if (this.state.busy) { return; }
		const selectedPort = event.target.value;
		console.log('handlePortChange', event, element)
		// cannot change if port is already opened
		const isOpen = await promisifyCall(Meteor.call, `isOpen`);
		if (isOpen) {
			this.setState({ message: 'close port before changing port', isPortOpen: isOpen })
		} else {
			this.setState({ selectedPort, isPortOpen: isOpen });
		}
	}

	render() {
		const { availablePorts, selectedPort, message, busy } = this.state;
		return (
			<div className="container">
				<span>Busy: {busy.toString()}</span> <span>{message}</span>
				<br/>
				<button disabled={busy} className="listport" onClick={this.handleListPortClick}>List ports</button>
				<select disabled={busy} name="portname" onChange={this.handlePortChange} value={selectedPort}>
					{availablePorts.map(o => {
						return (
							<option key={o.comName} value={o.comName}>{o.comName}</option>
						);
					})}
				</select>
				<LiveStamp timestamp={new Date()}/>
				<button disabled={busy} name="openport" onClick={this.handleOpenPortClick}>Open Port</button>
				<button disabled={busy} name="closeport" onClick={this.handleClosePortClick}>Close Port</button>
				<PortComponent portName={selectedPort}/>
			</div>
		);
	}
}

Meteor.startup(() => {
	render(<App />, document.getElementById('render-target'));
});