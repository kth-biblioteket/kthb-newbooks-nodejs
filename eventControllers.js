require('dotenv').config()

const eventModel = require('./eventModels');

const axios = require('axios')
const fs = require("fs");
const path = require('path');

async function readNewbook(payment_id) {
    try {
        result = await eventModel.readNewbook(payment_id)
        return result;
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function createNewbook(payment_id, primary_id, fee_id) {
    try {
        let result = await eventModel.createNewbook(payment_id, primary_id, fee_id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function updateNewbook(id, finished) {
    try {
        let result = await eventModel.updateNewbook(id, finished)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function deleteNewbook(id) {
    try {
        let result = await eventModel.deleteNewbook(id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function readNewbooks(req, res, next) {
    if(req.query.activationdate) {
        try {
            result = await eventModel.readNewbooks(req.query.activationdate)
            res.send(result);
        } catch (err) {
            console.log(err.message)
            return "error: " + err.message
        }
    } else {
        res.send({"error": "missing activationdate"});
    }
    
}

module.exports = {
    readNewbook,
    createNewbook,
    updateNewbook,
    deleteNewbook,
    readNewbooks
}