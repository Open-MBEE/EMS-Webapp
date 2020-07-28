'use strict';

angular.module('mms')
.factory('AuthService', ['$q', '$http', 'CacheService', 'URLService', 'HttpService', 'ElementService', 'ViewService', 'ProjectService', '$window', '$analytics', AuthService]);

/**
 * @ngdoc service
 * @name mms.ApplicationService
 * @requires $q
 * @requires $http
 * @requires URLService
 * @requires HttpService
 * @requires ElementService
 * @requires ViewService
 * @requires ProjectService
 *
 * @description
 * Provide general authorization functions. I.e. login, logout, etc...
 */
function AuthService($q, $http, CacheService, URLService, HttpService, ElementService, ViewService, ProjectService, $window, $analytics) {
    
    var ticket = $window.localStorage.getItem('ticket');
    var getAuthorized = function (credentials) {
        var deferred = $q.defer();
        var loginURL = URLService.getAuthenticationUrl();
        $http.post(loginURL, credentials).then(function (success) {
            URLService.setTicket(success.data.token);
            ticket = success.data.token;
            $window.localStorage.setItem('ticket', ticket);
            deferred.resolve(ticket);
        }, function(fail){
            URLService.handleHttpStatus(fail.data, fail.status, fail.header, fail.config, deferred);
            deferred.reject(fail);
        });
        return deferred.promise;
    };
    
    var removeTicket = function(){
        $window.localStorage.removeItem('ticket');
        ticket = undefined;
        URLService.setTicket(null);
        HttpService.dropAll();
        ElementService.reset();
        ProjectService.reset();
        ViewService.reset();
        CacheService.reset();
    };

    var getTicket = function(){
        return ticket;
    };

    var checkLogin = function(){
        var deferred = $q.defer();
        if (!ticket) {
            deferred.reject(false);
            return deferred.promise;
        }

        $http.get(URLService.getCheckTicketURL()).then(function (success) {
            deferred.resolve(success.data.username);
            $analytics.setUsername(success.data.username);
        }, function(fail){
            deferred.reject(fail);
            removeTicket();
        });
        return deferred.promise;
    };

    var logout = function() {
        var deferred = $q.defer();
        checkLogin().then(function() {
            removeTicket();
            //$cookies.remove('com.tomsawyer.web.license.user');
        }, function() {
            removeTicket();
            deferred.resolve(true);
        });
        return deferred.promise;
    };

    return {
        getAuthorized: getAuthorized,
        getTicket: getTicket,
        removeTicket: removeTicket,
        checkLogin: checkLogin,
        logout: logout
    };

}
