// import the `Kafka` instance from the kafkajs library
const { Kafka } = require("kafkajs")
const topic = 'es-topic'
const creds = require ("./creds.json")
const redis = require("redis")

//create Redis things

const ca = Buffer.from(creds.redis_credentials.value["connection.cli.certificate.certificate_base64"], 'base64').toString('utf-8')
//console.log(ca)
const tls = { ca };
const url = creds.redis_credentials.value["connection.rediss.composed.0"]
//console.log(url)
const redisClient = redis.createClient(url, { tls: { ca: ca } })

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

const consumer = kafka.consumer({ groupId: 'redis' })

const run = async () => {
  await consumer.connect()
  console.log("connected to kafka")
  //await redisClient.connect();
  //console.log("connected to Redis")


  await consumer.subscribe({ topic
							//, fromBeginning: true
						 })
  await consumer.run({
    eachBatch: async ({ batch }) => {
	  const batchSize = batch.rawMessages.length
      console.log("Received a batch of ", batchSize)
	  //first just turn the messages into a nice array of objects ready for anything!
	  batch.rawMessages = batch.rawMessages.map ( function (d) {
		  let retval = d.value.toString()
		  //console.log(retval)
		  retval = JSON.parse(retval)
		  //console.log(retval)
 
		  return retval

	  })
	  // assume that all items in array are in time order
	  // we want the latest object for each available truck id
      let redisObj = {}
	  for (var message of batch.rawMessages) {
		  //you should end up with an object with the latest value for each truck
		redisObj[message.truckId] = message
	  }
	  console.log(redisObj)
	  for (var truckId in redisObj) {
		  await redisClient.hset("trucks", truckId, JSON.stringify(redisObj[truckId]))
		  console.log("written to Redis: ", truckId)
	  }
    },
   })
}

run().catch(e => console.error(`[example/consumer] ${e.message}`, e))




