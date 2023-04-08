const redis = require('../config/redis')


const pushDataViaHMSET = ({ body: { key, data, ttl } }) => {
    console.log(key,data,ttl)
    redis.client.hmset(key, data)
    redis.client.expire(key, ttl)
}

const getHMSETData = async (key) => {
    return redis.client.hgetallAsync(key)
}

const getRemainingTime = async (key) => {
    return redis.client.ttlAsync(key)
}

const deleteKey = async (key) => {
    return redis.client.delAsync(key)
}



module.exports = {
    putData : pushDataViaHMSET,
    getData : getHMSETData,
    getTTL : getRemainingTime,
    expireKey: deleteKey

}