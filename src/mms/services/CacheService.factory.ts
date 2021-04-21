import * as angular from 'angular'
var mms = angular.module('mms');

mms.factory('CacheService', ['_', CacheService]);

/**
 * @ngdoc service
 * @name mms.CacheService
 * @requires _
 * 
 * @description
 * Provides cache of key value pairs. Key can be a string or an array of strings.
 */
function CacheService(_) {
    var cache = {};

    /**
     * @ngdoc method
     * @name mms.CacheService#get
     * @methodOf mms.CacheService
     * 
     * @description
     * Get value from cache
     * 
     * @param {Array.<string>|string} key String key or Array of hierarchical keys
     * @returns {Object} Value if found, null if not found
     */
    var get = function(key) {
        var realkey = key;
        if (angular.isArray(key)) {
            realkey = makeKey(key);
        }
        if (cache.hasOwnProperty(realkey)) {
            var realval = cache[realkey];
            if (angular.isString(realval)) {
                return get(realval);
            }
            return realval;
        }
        return null;
    };

    /**
     * @ngdoc method
     * @name mms.CacheService#getElements
     * @methodOf mms.CacheService
     * 
     * @description
     * Get the latest elements in the cache with the parameter workspace ID
     * 
     * @param {string} projectId The mms project id
     * @param {string} refId The branch/tag id
     * @returns {Object} Value if found, null if not found
     */
    var getLatestElements = function(projectId, refId) {
        var latestElements = [];
        for (var key in cache) {
            if (!cache.hasOwnProperty(key)) {
                continue;
            }
            if (key.indexOf('|latest') >= 0 && key.indexOf('element|') >= 0 && key.indexOf('|edit') < 0 && 
                    key.indexOf('deleted') < 0 && key.indexOf(refId) >= 0 && key.indexOf(projectId) >= 0) {
                var val = get(key);
                if (val) {
                    latestElements.push(val);
                }
            }
        }
        return latestElements;
    };

    /**
     * @ngdoc method
     * @name mms.CacheService#put
     * @methodOf mms.CacheService
     * 
     * @description
     * Put value into cache
     * 
     * @param {Array.<string>|string} key String key or Array of hierarchical keys
     * @param {Object} value The value to save
     * @param {boolean} [merge=false] Whether to replace the value or do a merge if value already exists
     * @returns {Object} the original value
     */
    var put = function(key, value, merge) {
        var m = !merge ? false : merge;
        var realkey = key;
        if (angular.isArray(key)) {
            realkey = makeKey(key);
        }
        var val = get(realkey);
        if (val && m && angular.isObject(value)) {
            _.merge(val, value, function(a,b,id) {
                if ((id === '_contents' || id === 'specification') && b && b.type === 'Expression') {
                    return b;
                }
                if (angular.isArray(a) && angular.isArray(b) && b.length < a.length) {
                    a.length = 0;
                    Array.prototype.push.apply(a, b);
                    return a; 
                }
                if (id === '_displayedElementIds' && b) {
                    return b;
                }
                return undefined;
            });
        } else {
            if (!angular.isString(val) || angular.isString(value)) {
                cache[realkey] = value;
            } else {
                realkey = val;
                while (angular.isString(cache[realkey])) {
                    realkey = cache[realkey];
                }
                cache[realkey] = value;
            }
            val = value;
        }
        return val;
    };

    /**
     * @ngdoc method
     * @name mms.CacheService#remove
     * @methodOf mms.CacheService
     * 
     * @description
     * Remove value from cache and return it
     * 
     * @param {Array.<string>|string} key String key or Array of hierarchical keys
     * @returns {Object} value that was removed or undefined
     */
    var remove = function(key) {
        var realkey = key;
        if (angular.isArray(key)) {
            realkey = makeKey(key);
        }
        if (!cache.hasOwnProperty(realkey)) {
            return null;
        }
        var result = cache[realkey];
        delete cache[realkey];
        if (angular.isString(result)) {
            return remove(result);
        }
        return result;
    };

    /**
     * @ngdoc method
     * @name mms.CacheService#exists
     * @methodOf mms.CacheService
     * 
     * @description
     * Check if value exists with a specific key
     * 
     * @param {Array.<string>|string} key String key or Array of hierarchical keys
     * @returns {boolean} whether value exists for key
     */
    var exists = function(key) {
        var realkey = key;
        if (angular.isArray(key)) {
            realkey = makeKey(key);
        }
        if (!cache.hasOwnProperty(realkey)) {
            return false;
        }
        var val = cache[realkey];
        if (angular.isObject(val)) {
            return true;
        }
        if (angular.isString(val)) {
            return exists(val);
        }
        return false;
    };

    var makeKey = function(keys) {
        return keys.join('|');
    };

    var getCache = function() {
        return cache;
    };

    var reset = function() {
        var keys = Object.keys(cache);
        for (var i = 0; i < keys.length; i++) {
            delete cache[keys[i]];
        }
    };

    return {
        get: get,
        getLatestElements: getLatestElements,
        put: put,
        exists: exists,
        remove: remove,
        getCache: getCache,
        reset: reset
    };
}