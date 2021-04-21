import * as angular from 'angular'
var mms = angular.module('mms');

mms.factory('ApplicationService', ['$q', '$http', 'URLService', ApplicationService]);

/**
 * @ngdoc service
 * @name mms.ApplicationService
 * @requires $q
 * @requires $http
 * @requires URLService
 *
 * @description
 * Provide general applications functions such as getting MMS Version, getting username,
 * creating unique IDs, etc...
 */
function ApplicationService($q, $http, URLService) {
    var source = createUniqueId();
    var username;
    var state = {};

    function createUniqueId() {
        var s = [];
        var hexDigits = "0123456789abcdef";
        for (var i = 0; i < 36; i++) {
            s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
        }

        s[14] = "4";
        s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);
        //s[8] = s[13] = s[18] = s[23] = "-";
        return s.join("");
    }

    var getSource = function () {
        return source;
    };

    var getMmsVersion = function () {
        var deferred = $q.defer();
        $http.get(URLService.getMmsVersionURL(),URLService.getRequestConfig())
            .then(function (response) {
                deferred.resolve(response.data.mmsVersion);
            }, function (response) {
                URLService.handleHttpStatus(response.data, response.status, response.headers, response.config, deferred);
            });
        return deferred.promise;
    };

    var setUserName = function (user) {
        username = user;
    };

    var getUserName = function () {
        return username;
    };

    var getState = function() {
        return state;
    };

    return {
        getSource: getSource,
        createUniqueId: createUniqueId,
        getMmsVersion: getMmsVersion,
        setUserName: setUserName,
        getUserName: getUserName,
        getState: getState
    };

}