import * as angular from "angular";
var mms = angular.module('mms');


mms.factory('VizService', ['$q', '$http', 'URLService', 'CacheService', 'UtilsService', 'AuthService', VizService]);

/**
 * @ngdoc service
 * @name mms.VizService
 * @requires $q
 * @requires $http
 * @requires mms.URLService
 * @requries mms.CacheService
 * @requires mms.UtilsService
 * 
 * @description
 * This service handles visualization needs and diagramming (TBD)
 */
function VizService($q, $http, URLService, CacheService, UtilsService, AuthService) {

    /**
     * @ngdoc method
     * @name mms.VizService#getImageURL
     * @methodOf mms.VizService
     * 
     * @description
     * Gets the url for an image link based on the Magicdraw diagram id 
     * 
     * @returns {Promise} The promise will be resolved with the latest image url
     */
    var getImageURL = function(reqOb) {
        var deferred = $q.defer();
        var cacheKey = createImageCacheKey(reqOb);
        if (CacheService.exists(cacheKey)) {
            deferred.resolve(makeImageUrl(CacheService.get(cacheKey)));
            return deferred.promise;
        }
        $http.get(URLService.getImageURL(reqOb), {headers: {Accept: reqOb.accept, Authorization: 'Bearer ' + AuthService.getToken()}})
        .then(function(data) {
            CacheService.put(cacheKey, data.data.artifacts[0], false);
            deferred.resolve(makeImageUrl(data.data.artifacts[0]));
        }, function(data) {
            URLService.handleHttpStatus(data.data, data.status, data.headers, data.config, deferred);
        });
        return deferred.promise;
    };

    var makeImageUrl = function(data) {
        var root = URLService.getRoot();
        var newroot = '';
        if (root.indexOf('http') > -1) {
            var parts = root.split('/');
            if (parts.length >= 3)
                newroot = parts[0] + '/' + parts[1] + '/' + parts[2];
        }
        return newroot + '/alfresco' + data.url + '?alf_ticket=' + AuthService.getToken();
    };

    var createImageCacheKey = function(reqOb) {
        var refId = !reqOb.refId ? 'master' : reqOb.refId;
        var commitId = !reqOb.commitId ? 'latest' : reqOb.commitId;
        return ['image', reqOb.projectId, refId, reqOb.elementId, commitId, reqOb.accept];
    };

    return {
        getImageURL: getImageURL
    };

}