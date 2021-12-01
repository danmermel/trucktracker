// import the `Kafka` instance from the kafkajs library
const { Kafka } = require("kafkajs")
const topic = 'es-topic'
const creds = require("./creds.json")
const path = require("path")

if (process.argv.length !== 4) {
	console.error("Usage: node producer.js <datafile> <truckid>")
	process.exit(1)
}
const routeData = process.argv[2]
const truckId = process.argv[3]

console.log(path.join(__dirname,routeData))

const data = require(path.join(__dirname, routeData))


// initialize a new kafka client and initialize a producer from it
const kafka = new Kafka({
	clientId: 'my-app',
	brokers: [creds.eventstreams_credentials.value["kafka_brokers_sasl.0"],
			creds.eventstreams_credentials.value["kafka_brokers_sasl.1"],
			creds.eventstreams_credentials.value["kafka_brokers_sasl.2"],
			creds.eventstreams_credentials.value["kafka_brokers_sasl.3"],
			creds.eventstreams_credentials.value["kafka_brokers_sasl.4"],
			creds.eventstreams_credentials.value["kafka_brokers_sasl.5"]
		
	],
	// authenticationTimeout: 1000,
	// reauthenticationThreshold: 10000,
	ssl: true,
	sasl: {
		mechanism: 'plain', // scram-sha-256 or scram-sha-512
		username: creds.eventstreams_credentials.value.user,
		password: creds.eventstreams_credentials.value.password
	},
})

const producer = kafka.producer()

// we define an async function that writes a new message each second
const produce = async () => {
	await producer.connect()
	const arrayLength = data.gpx.trk.trkseg.trkpt.length
	let forward = true // forward
	//create a random starting place 
	let i = Math.floor(Math.random()*arrayLength)
	console.log('Number of data points is: ', arrayLength, " and starting point is ", i )

	// after the produce has connected, we start an interval timer
	setInterval(async () => {
		try {
			//
			if (forward && i == arrayLength -1) {
				//end of data points reached
				console.log("End of data points reached. Returning...")
				forward = false
			}

			if (!forward && i == 0) {
				//end of data points reached
				console.log("End of data points reached. Returning...")
				forward = true
			}
			//cloning the data so as not to destroy the original with _lat / _long
			const obj = JSON.parse(JSON.stringify(data.gpx.trk.trkseg.trkpt[i]))
			obj.lat = obj._lat
			obj.lon = obj._lon
			delete obj._lat
			delete obj._lon 
			obj.truckId = truckId
			obj.date = new Date().toISOString()

			// send a message to the configured topic with
			// the key and value formed from the current value of `i`
			await producer.send({
				topic,
				messages: [{ "key": String(i), "value": JSON.stringify(obj) }]
			})

			// if the message is written successfully, log it and increment `i`
			console.log("writing: ", obj)
			forward ? i++ : i--  // if you are going forward then add, otherwise subtract
		} catch (err) {
			console.error("could not write message " + err)
		}
	}, 1000)
}

produce()



