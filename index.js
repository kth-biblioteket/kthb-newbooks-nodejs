require('dotenv').config()
const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
const axios = require('axios')
const express = require("express");
const bodyParser = require("body-parser");
const cors = require('cors')
const fs = require("fs");
const path = require('path');
const eventController = require('./eventControllers');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));


app.use(cors({ 
    origin: ['exlibrisgroup.com' ,'https://www.kth.se']
}));

const appRoutes = express.Router();

appRoutes.get("/books", eventController.readNewbooks)

appRoutes.get('/public/style.css', function(req, res) {
    res.sendFile(__dirname + "/public/css/" + "styles.css");
});

app.use('/newbooks/api/v1', appRoutes);

const server = app.listen(process.env.PORT || 3002, function () {
    const port = server.address().port;
    console.log("App now running on port", port);
});

function verifytoken(tokenValue) {
    //public key: https://api-eu.hosted.exlibrisgroup.com/auth/46KTH_INST/jwks.json
    var keys = {
        kty: "EC",
        kid: "primaPrivateKey-46KTH_INST",
        use: "sig",
        //Prod:
        //x: "L86_k3tvBIczvAB1oaauV4qOmgmrn_J8WiqDLy_SLuI",
        //y: "Uw4UYyRaEIfpIdYGwr1gDBoS8ZJcDiFR4znrx9qMSTg",
        //Sandbox:
        x: "JuSOZCLRcShdPerr0mmbgXKXrInLhvi2mjwhFAZdLIw",
        y: "GEcaigGlavpoQP7F23dZWBmsyNlGb_IDYGsT36V7M5g",
        crv: "P-256",
        alg: "ES256"
    }

    var pem = jwkToPem(keys);

    try {
        var token = jwt.verify( tokenValue, pem )
        return token
    } catch (err) {
        return 0
    }

}