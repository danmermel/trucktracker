// import the `Kafka` instance from the kafkajs library
const { Kafka } = require("kafkajs")
const topic = 'es-topic'
const data = require("./boulderToNYC.json")
const creds = require("./creds.json")

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
	let i = 0
	console.log('Number of data points is: ', data.gpx.trk.trkseg.trkpt.length )

	// after the produce has connected, we start an interval timer
	setInterval(async () => {
		try {
			//
			if (i >= data.gpx.trk.trkseg.trkpt.length) {
				//end of data points reached
				console.log("End of data points reached")
				throw new Error("You have arrived at your destination!")
			}
			const obj = data.gpx.trk.trkseg.trkpt[i]
			obj.lat = obj._lat
			obj.lon = obj._lon
			delete obj._lat
			delete obj._lon 
			obj.truckId = "truck001"
			obj.date = new Date().toISOString()

			// send a message to the configured topic with
			// the key and value formed from the current value of `i`
			await producer.send({
				topic,
				messages: [{ "key": String(i), "value": JSON.stringify(obj) }]
			})

			// if the message is written successfully, log it and increment `i`
			console.log("writing: ", obj)
			i++
		} catch (err) {
			console.error("could not write message " + err)
		}
	}, 1000)
}

produce()


