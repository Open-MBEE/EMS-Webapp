import * as angular from 'angular'
var mms = angular.module('mms');


mms.factory('ArtifactService', ['$q', '$http', 'URLService', 'UtilsService', 'CacheService', 'HttpService', 'ApplicationService', ArtifactService]);

/**
 * @ngdoc service
 * @name mms.ArtifactService
 * @requires $q
 * @requires $http
 * @requires mms.URLService
 * @requires mms.UtilsService
 * @requires mms.CacheService
 * @requires mms.HttpService
 * 
 * @description
 * A service to add, get, bulk get and update/create artifacts, with caching
 */
function ArtifactService($q, $http, URLService, UtilsService, CacheService, HttpService, ApplicationService) {

    var inProgress = {};

    /**
     * @ngdoc method
     * @name mms.ArtifactService#cacheArtifact
     * @methodOf mms.ArtifactService
     * 
     * @description
     * handles caching of artifact objects - in case the metadata of reqOb is different
     * from the artifact's canonical projectId/refId/commitId (due to being requested
     * from a different project context), it'll become an alias
     * 
     * @param {object} reqOb request keys - {projectId, refId, artifactId, commitId, extended}
     * @param {object} artifactOb object to cache
     * @param {boolean} [edit=false] whether object to cache is for editing
     * @returns {object} cached object
     */
    var cacheArtifact = function(reqOb, artifactOb, edit?) {
        var requestCacheKey = getArtifactCacheKey(reqOb, artifactOb.id);
        var origResultCommit = artifactOb._commitId;
        if (reqOb.commmitId === 'latest') {
            var resultCommitCopy = JSON.parse(JSON.stringify(artifactOb));
            artifactOb._commitId = 'latest'; //so realCacheKey is right later
            var commitCacheKey = UtilsService.makeArtifactKey(resultCommitCopy); //save historic artifact
            if (!edit) {
                CacheService.put(commitCacheKey, resultCommitCopy, true);
            }
        }
        var realCacheKey = UtilsService.makeArtifactKey(artifactOb, edit);
        artifactOb._commitId = origResultCommit; //restore actual commitId
        if (angular.equals(realCacheKey, requestCacheKey)) {
            artifactOb = CacheService.put(requestCacheKey, artifactOb, true);
        } else {
            CacheService.put(requestCacheKey, realCacheKey.join('|'));
            artifactOb = CacheService.put(realCacheKey, artifactOb, true);
        }
        return artifactOb;
    };

    /**
     * @ngdoc method
     * @name mms.ArtifactService#getArtifact
     * @methodOf mms.ArtifactService
     * 
     * @description
     * Gets an artifact object by projectId and artifactId. If the artifact object is already in the cache,
     * resolve the existing reference, if not or update is true, request it from server, 
     * add/merge into the cache. 
     * 
     * Most of these methods return promises that will reject with a reason object
     * when a server call fails, see
     * {@link mms.URLService#methods_handleHttpStatus the return object}
     *
     * ## Example Usage
     *  <pre>
        ArtifactService.getArtifact({
            projectId: 'projectId'
            artifactId: 'artifactId',
            refId: 'refId',         //default 'master'
        }).then(
            function(artifact) { //artifact is an artifact object (see json schema)
                alert('got ' + artifact.name);
            }, 
            function(reason) {
                alert('get artifact failed: ' + reason.message);
                //see mms.URLService#handleHttpStatus for the reason object
            }
        );
        </pre>
     * ## Example with commitId
     *  <pre>
        ArtifactService.getArtifact({
            projectId: 'projectId'
            artifactId: 'artifactId',
            refId: 'refId',         //default 'master'
            commitId: 'commitId',   //default 'latest'
        }).then(
            function(artifact) { //artifact is an artifact object (see json schema)
                alert('got ' + artifact.name);
            }, 
            function(reason) {
                alert('get artifact failed: ' + reason.message);
                //see mms.URLService#handleHttpStatus for the reason object
            }
        );
        </pre>
     * 
     * @param {object} reqOb object with keys as described in function description.
     * @param {integer} [weight=1] priority of request (2 is immediate, 1 is normal, 0 is low)
     * @param {boolean} [update=false] (optional) whether to always get the latest 
     *      from server, even if it's already in cache (this will update the cache if exists)
     * @returns {Promise} The promise will be resolved with the artifact object, 
     *      multiple calls to this method with the same parameters would give the
     *      same object
     */
    var getArtifact = function(reqOb, weight, update) {
        UtilsService.normalize(reqOb);
        var requestCacheKey = getArtifactCacheKey(reqOb);
        var key = URLService.getArtifactURL(reqOb);

        // if it's in the inProgress queue get it immediately
        if (inProgress.hasOwnProperty(key)) { //change to change proirity if it's already in the queue
            HttpService.ping(key, weight);
            return inProgress[key];
        }
        var deferred = $q.defer();
        var cached = CacheService.get(requestCacheKey);
        if (cached && !update) {
            deferred.resolve(cached);
            return deferred.promise;
        }
        inProgress[key] = deferred.promise;
        HttpService.get(key,
            function(data, status, headers, config) {
                if (angular.isArray(data.artifacts) && data.artifacts.length > 0) {
                    deferred.resolve(cacheArtifact(reqOb, data.artifacts[0]));
                } else {
                    deferred.reject({status: 500, data: '', message: "Server Error: empty response"});
                }
                delete inProgress[key];
            },
            function(data, status, headers, config) {
                URLService.handleHttpStatus(data, status, headers, config, deferred);
                delete inProgress[key];
            },
            weight
        );
        return deferred.promise;
    };

    /**
     * @ngdoc method
     * @name mms.ArtifactService#getArtifacts
     * @methodOf mms.ArtifactService
     * 
     * @description
     * Same as getArtifact, but for multiple ids.
     * 
     * @param {object} reqOb keys - {projectId, refId, artifactIds (array of ids), commitId, extended}
     * @param {integer} [weight=1] priority of request (2 is immediate, 1 is normal, 0 is low)
     * @param {boolean} [update=false] (optional) whether to always get the latest 
     *      from server, even if it's already in cache (this will update the cache if exists)
     * @returns {Promise} The promise will be resolved with an array of artifact objects, 
     *      multiple calls to this method with the same parameters would give the
     *      same objects
     */
    var getArtifacts = function(reqOb, weight, update) {
        var deferred = $q.defer();
        var request = {artifacts: []};
        var existing = [];
        UtilsService.normalize(reqOb);
        for (var i = 0; i < reqOb.artifactIds.length; i++) {
            var id = reqOb.artifactIds[i];
            var requestCacheKey = getArtifactCacheKey(reqOb, id);
            var exist = CacheService.get(requestCacheKey);
            if (exist && !update) {
                existing.push(exist);
                continue;
            }
            request.artifacts.push({id: id});
        }
        if (request.artifacts.length === 0) {
            deferred.resolve(existing);
            return deferred.promise;
        }
        $http.put(URLService.getPutArtifactsURL(reqOb), request, URLService.getRequestConfig())
        .then(function(response) {
            var data = response.data.artifacts;
            for (var i = 0; i < data.length; i++) {
                existing.push(cacheArtifact(reqOb, data[i]));
            }
            deferred.resolve(existing);
        }, function(response) {
            URLService.handleHttpStatus(response.data, response.status, response.headers, response.config, deferred);
        });
        return deferred.promise;
    };

    /**
     * @ngdoc method
     * @name mms.ArtifactService#getArtifactHistory
     * @methodOf mms.ArtifactService
     * 
     * @description
     * Queries for an artifact's entire version history
     *
     * @param {object} reqOb see getArtifact
     * @param {integer} [weight=1] priority
     * @param {boolean} [update=false] update from server
     * @returns {Promise} The promise will be resolved with an array of commit objects.
     */
    var getArtifactHistory = function(reqOb, weight, update) {
        UtilsService.normalize(reqOb);
        var key = URLService.getArtifactHistoryURL(reqOb);
        if (inProgress.hasOwnProperty(key)) {
            return inProgress[key];
        }
        var requestCacheKey = ['artifactHistory', reqOb.projectId, reqOb.refId, reqOb.artifactId];
        var deferred = $q.defer();
        if (CacheService.exists(requestCacheKey) && !update) {
            deferred.resolve(CacheService.get(requestCacheKey));
            return deferred.promise;
        }
        inProgress[key] = deferred.promise;
        $http.get(URLService.getArtifactHistoryURL(reqOb),URLService.getRequestConfig())
        .then(function(response) {
            deferred.resolve(CacheService.put(requestCacheKey, response.data.commits, true));
            delete inProgress[key];
        }, function(response) {
            URLService.handleHttpStatus(response.data, response.status, response.headers, response.config, deferred);
            delete inProgress[key];
        });
        return deferred.promise;
    };

    /**
     * @ngdoc method
     * @name mms.ArtifactService#updateArtifact
     * @methodOf mms.ArtifactService
     * 
     * @description
     * Save artifact to mms and update the cache if successful, the artifact object
     * must have an id, and whatever property that needs to be updated.
     * 
     * {@link mms.ArtifactService#methods_getElementForEdit see also getElementForEdit}
     *
     * @param {object} artifactOb An object that contains _projectId, _refId, sysmlId and any property changes to be saved.
     * @returns {Promise} The promise will be resolved with the updated cache element reference if 
     *      update is successful. If a conflict occurs, the promise will be rejected with status of 409
     */
    // var updateArtifact = function(artifactOb, returnChildViews) { //artifactOb should have the keys needed to make url
    //     var deferred = $q.defer();
    //     return deferred.promise;
    // };

    /**
     * @ngdoc method
     * @name mms.ArtifactService#createArtifact
     * @methodOf mms.ArtifactService
     * 
     * @description
     * Create artifact on mms.
     * 
     * @param {object} reqOb see description of getArtifact, instead of artifactId,
     *                       'artifact' key should be the artifact object to create
     * @returns {Promise} The promise will be resolved with the created artifact
     *                    references if create is successful.
     */
    // var createArtifact = function(reqOb) {
    //     return deferred.promise;
    // };

    var getArtifactCacheKey = function(reqOb, id?, edit?) {
        var refId = !reqOb.refId ? 'master' : reqOb.refId;
        var commitId = !reqOb.commitId ? 'latest' : reqOb.commitId;
        var artifactId = id ? id : reqOb.artifactId;
        var key = ['artifact', reqOb.projectId, refId, artifactId, commitId];
        if (edit) {
            key.push('edit');
        }
        return key;
    };

    var reset = function() {
        inProgress = {};
    };


    return {
        cacheArtifact: cacheArtifact,
        getArtifact: getArtifact,
        getArtifacts: getArtifacts,
        getArtifactHistory: getArtifactHistory,
        // createArtifact: createArtifact,
        // updateArtifact: updateArtifact,
        reset: reset
    };
}