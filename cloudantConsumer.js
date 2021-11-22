// import the `Kafka` instance from the kafkajs library
const { Kafka } = require("kafkajs")
const topic = 'es-topic'
const creds = require ("./creds.json")
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

const consumer = kafka.consumer({ groupId: 'cloudant' })

const run = async () => {
  await consumer.connect()
  await consumer.subscribe({ topic
							//, fromBeginning: true
						 })
  await consumer.run({
    eachBatch: async ({ batch }) => {
	  const batchSize = batch.rawMessages.length
      console.log("Received a batch of ", batchSize)
	  batch.rawMessages = batch.rawMessages.map ( function (d) {
		  let retval = d.value.toString()
		  //console.log(retval)
		  retval = JSON.parse(retval)
		  //console.log(retval)
		  return retval

	  })
	  console.log(batch.rawMessages)
    },
//     eachMessage: async ({ topic, partition, message }) => {
//       const prefix = `${topic}[${partition} | ${message.offset}] / ${message.timestamp}`
//       console.log(`- ${prefix} ${message.key}#${message.value}`)
//     },
   })
}

run().catch(e => console.error(`[example/consumer] ${e.message}`, e))




