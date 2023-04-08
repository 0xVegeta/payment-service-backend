# payment-gateway
 # Payment Gateway

A Payment Gateway build upon NodeJS using ExpressJS. It basically is a backend application to be used by businesses to streamline the incoming payments from their respective customers.

## Technology Stack
- *Server Enviornment* - NodeJS
- *Framework* - ExpressJS
- *Database* - MongoDB
- *Cloud database service* - MongoDB Atlas
- *Authorizatiion* - JWT
- *Backend Deployment* - Render


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
   NODE_ENV 
   PORT 
   MONGO_URI 
   JWT_SECRET 
   
# Start application
$ npm start

# Make requests on http://localhost:PORT/ from Postman
```

## Happy Flow
A business can login itself by entering email and password or register itself by entering the Organisation Name, email, password and category. A soon as a buisiness gets registered, a wallet is created for them using their credentials.

![Database design diagram](https://github.com/0xVegeta/payment-gateway/raw/main/Database%20design.jpeg)


## API Reference

#### Get all items

## API Reference

#### Register an organization

```http
  POST /api/v1/org/register
```

| Access   | Description                |
|:-------  | :------------------------- |
| `string` | **Required**. Your API key |

