import * as angular from 'angular'
var mms = angular.module('mms');

mms.service('ConfigService', ['$http', ConfigService]);
/**
 * @ngdoc service
 * @name mms.ConfigService
 * @requires $http
 *
 * @description
 * Provides promise containing the key value pairs stored in the 'app/config.json' file.
 */
function ConfigService($http) {
  return function() {
    return $http.get('config/config.json');
  };
}
