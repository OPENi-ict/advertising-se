var log = require('npmlog');
var Client = require('node-rest-client').Client;
var Promise = require('bluebird');

var config = require('./../config');
var configAuth = config.auth;
var configSearch = config.search;

var ENCODING = 'utf8';

log.level = config.log.level;
log.heading = config.log.header;

var LOG_TAG = 'openi.js';

var params = {
    auth: '',
    authURL: configAuth.authURL,
    searchURL: configSearch.searchURL,
    postAuthOptions: {
        data: {
            "username": configAuth.username,
            "password": configAuth.password,
            "scope": ""
        },
        headers:{
            "Content-Type": "application/json"
        }
    },
    getPostSearchOptions: function () {
        var that = this;
        log.verbose(LOG_TAG, 'that auth: ', that.auth);
        return {
            headers: {
                "Authorization": that.auth
            }
        }
    }
};

module.exports = {
    search: search,
    getAuth: getAuth
};

function search(query) {
    return new Promise(function (resolve, reject) {
        log.verbose(LOG_TAG, 'post the search');
        try {
            var client = new Client();
            var urlAndQuery = params.searchURL;
            query[1] = query[1].replace("%26", "%2C"); // ugly and nasty hack todo: correct.
            urlAndQuery += '?'+ query[1];
            client.get(urlAndQuery, params.getPostSearchOptions(),
                function (data) {
                    try {
                        var dataStr = data.toString(ENCODING);
                        var openiData = JSON.parse(dataStr);
                        if (openiData.error && openiData.error === TOKEN_HAS_EXPIRED) {
                            return resolve(TOKEN_HAS_EXPIRED);
                        }
                        return resolve(openiData);
                    } catch(err) {
                        log.error(LOG_TAG, 'getPostSearchOptions: ', err);
                        reject(err);
                    }
                }, function (err) {
                    log.error(LOG_TAG, 'get error: ', err);
                    reject("Couldn't connect with OPENi \n" + err);
                });
        } catch (e) {
            reject(e);
        }
    });
}

function getAuth() {
    return params.auth === '' ? getAuthFromOpeni() : Promise.resolve(params.auth);
}

function getAuthFromOpeni() {
    return new Promise(function (resolve, reject) {
        log.verbose(LOG_TAG, 'gettitng new token');
        try {
            var client = new Client();
            client.post(params.authURL, params.postAuthOptions,
                function (data) {
                    var dataStr = data.toString(ENCODING);
                    var token = JSON.parse(dataStr).session;
                    log.verbose(LOG_TAG, 'dataStr: ', dataStr);
                    params.auth = token;
                    log.verbose(LOG_TAG, 'auth: ', params.auth);
                    resolve();
                }, function (err) {
                    log.error(LOG_TAG, 'post err: ', err);
                    reject(err);
                });
        } catch (e) {
            reject(e);
        }

    });
}