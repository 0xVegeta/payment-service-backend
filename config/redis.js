
const redis = require('redis');
const client = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    
});
console.log('yooooooooooooo');
client.on("connect",  ()=> {
    console.log("=======================Application is now connected to Redis=====================");
});

client.on('error', err => {
    console.log('Error ' + err);
});