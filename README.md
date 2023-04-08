# Payment Service

A Payment Gateway build upon NodeJS using ExpressJS. It basically is a backend application to be used by businesses to streamline the incoming payments from their respective customers.

## Technology Stack
- *Server Enviornment* - NodeJS
- *Framework* - ExpressJS
- *Database* - MongoDB
- *Cloud database service* - MongoDB Atlas
- *Authorizatiion* - JWT
- *Backend Deployment* -

## Installation

- First, fork this repository and follow the given instructions:

```
# clone the repository to your local machine
$ git clone `git clone https://github.com/<YOUR-GITHUB-USERNAME>/payment-gateway.git`

# navigate to the project's directory and install all the relevant dev-dependencies as well as dependencies
$ npm i

# create a MongoDB Atlas instance and obtain the MongoDB URI
# choose a random JWT secret
# create a .env file with the following fields according to the knowledge obtained
   REDIS_HOST 
   REDIS_PORT 
   MONGO_URI 
   JWT_SECRET 
   
# Start application
$ npm start

# Make requests on http://localhost:PORT/ from Postman
```

## Happy Flow
A business can login itself by entering email and password or register itself by entering the Organisation Name, email, password and category. A soon as a buisiness gets registered, a wallet is created for them using their credentials.
### Basic Database Design diagram
![Database design diagram](https://github.com/0xVegeta/payment-gateway/raw/main/assets/Database%20design.jpeg)<br>

### Payment-session API
![Payment-session API](https://github.com/0xVegeta/payment-gateway/raw/main/assets/payment-session-API.jpeg)<br>

### Accept Payment API
![Accept-payment](https://github.com/0xVegeta/payment-gateway/raw/main/assets/accept-payment.jpeg)

## API Reference

#### Get all items

## API Reference

`/api/v1/org`

| REQUEST METHODS | ENDPOINTS | DESCRIPTION |
| :-------------- | :-------: | ------------------: |
| POST | /register |  Register your organization |
| POST | /login| Login from your organization account|
| GET | /profile | Get your organization profile |
| PUT | /put | Add/update addition profile details|


`/api/v1/txn`

| REQUEST METHODS | ENDPOINTS | DESCRIPTION |
| :-------------- | :-------: | ------------------: |
| POST | /payment-session/:walletCode |  Create a unique payment session |
| POST | /accept-payment/:transactionTraceId | Accept payment|
| POST | /transaction | Get all transaction details of an organization |

`/api/v1/wallets`

| REQUEST METHODS | ENDPOINTS | DESCRIPTION |
| :-------------- | :-------: | ------------------: |
| POST | / |  Create a wallet within an organization |
| GET | / | Get all the wallets of a user |


# Future Scope
```
1. A queuing service (probably Kafka/RabbitMQ) to significantly increase throughput of the API and reduce load on the database
2. Add invoicing (and OTP service) via RabbitMQ
3. Add refund/withdraw APIs and handle failure scenarios at each step

```

