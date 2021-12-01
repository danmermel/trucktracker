// import the `Kafka` instance from the kafkajs library
const { Kafka } = require("kafkajs")
const topic = 'es-topic'
const creds = require("./creds.json")

//create kafka object with access credentials
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

//create cloudant object with access credentials
const { CloudantV1 } = require('@ibm-cloud/cloudant')

const { IamAuthenticator } = require('ibm-cloud-sdk-core');
const authenticator = new IamAuthenticator({
	apikey: creds.cloudant_credentials.value.apikey
});
const cloudant = new CloudantV1({
	authenticator: authenticator
});
cloudant.setServiceUrl(creds.cloudant_credentials.value.url);

//create db if it doesn't exist already
const dbName = "trucktracker"
const createDb = cloudant
	.putDatabase({ db: dbName })
	.then((putDatabaseResult) => {
		if (putDatabaseResult.result.ok) {
			console.log(`"${dbName}" database created."`);
		}
	})
	.catch((err) => {
		if (err.code === 412) {
			console.log(
				'Cannot create "' + dbName + '" database, it already exists.'
			);
		}
	});

const consumer = kafka.consumer({ groupId: 'cloudant' })


const run = async () => {
	await consumer.connect()
	await consumer.subscribe({
		topic
		//, fromBeginning: true
	})
	await consumer.run({

			eachBatch: async ({ batch }) => {
				const batchSize = batch.rawMessages.length
				console.log("Received a batch of ", batchSize)
				batch.rawMessages = batch.rawMessages.map(function (d) {
					let retval = d.value.toString()
					//console.log(retval)
					retval = JSON.parse(retval)
					//console.log(retval)

					return retval

				})
				const bulkDocs = { docs: batch.rawMessages }

				const response = await cloudant.postBulkDocs({
					db: dbName,
					bulkDocs: bulkDocs
				})
				console.log("response is ", response)
				console.log("number of docs uploaded: ", batch.rawMessages.length)
			},

	})
}


run().catch(e => console.error(`[example/consumer] ${e.message}`, e))





