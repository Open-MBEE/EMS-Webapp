'use strict';

angular.module('mms')
.factory('ElementService', ['$q', '$http', 'URLService', 'UtilsService', 'CacheService', 'HttpService', 'ApplicationService', '_', ElementService]);

/**
 * @ngdoc service
 * @name mms.ElementService
 * @requires $q
 * @requires $http
 * @requires mms.URLService
 * @requires mms.UtilsService
 * @requires mms.CacheService
 * @requires mms.HttpService
 * 
 * @description
 * An element CRUD service with additional convenience methods for managing edits.
 */
function ElementService($q, $http, URLService, UtilsService, CacheService, HttpService, ApplicationService, _) {

    var inProgress = {};// leave for now
    /**
     * @ngdoc method
     * @name mms.ElementService#getElement
     * @methodOf mms.ElementService
     * 
     * @description
     * Gets an element object by projectId and elementId. If the element object is already in the cache,
     * resolve the existing reference, if not or update is true, request it from server, 
     * add/merge into the cache. 
     * 
     * Most of these methods return promises that will reject with a reason object
     * when a server call fails, see
     * {@link mms.URLService#methods_handleHttpStatus the return object}
     *
     * ## Example Usage
     *  <pre>
        ElementService.getElement({projectId: 'projectId', elementId: 'element_id'}).then(
            function(element) { //element is an element object (see json schema)
                alert('got ' + element.name);
            }, 
            function(reason) {
                alert('get element failed: ' + reason.message); 
                //see mms.URLService#handleHttpStatus for the reason object
            }
        );
        </pre>
     * ## Example with commitId
     *  <pre>
        ElementService.getElement({
            projectId: 'projectId', 
            elementId: 'elementId', 
            refId: 'refId',         //default 'master'
            commitId: 'commitId',   //default 'latest'
            extended: true          //default false (extended includes _qualifiedName, _qualifiedId, _childViews)
        }).then(
            function(element) { //element is an element object (see json schema)
                alert('got ' + element.name);
            }, 
            function(reason) {
                alert('get element failed: ' + reason.message); 
                //see mms.URLService#handleHttpStatus for the reason object
            }
        );
        </pre>
     * 
     * @param {object} reqOb object with keys as described in function description.
     * @param {integer} [weight=1] priority of request (2 is immediate, 1 is normal, 0 is low)
     * @param {boolean} [update=false] (optional) whether to always get the latest 
     *      from server, even if it's already in cache (this will update the cache if exists)
     * @returns {Promise} The promise will be resolved with the element object, 
     *      multiple calls to this method with the same parameters would give the
     *      same object
     */
    var getElement = function(reqOb, weight, update) {
        UtilsService.normalize(reqOb);
        var requestCacheKey = getElementKey(reqOb);
        var url = URLService.getElementURL(reqOb);
        var key = url;
        // if it's in the inProgress queue get it immediately
        if (inProgress.hasOwnProperty(key)) { //change to change proirity if it's already in the queue
            HttpService.ping(key, weight);
            return inProgress[key];
        }
        var deferred = $q.defer();
        var cached = CacheService.get(requestCacheKey);
        if (cached && !update && (!reqOb.extended || (reqOb.extended && cached._qualifiedId))) {
            deferred.resolve(cached);
            return deferred.promise;
        }
        var deletedRequestCacheKey = getElementKey(reqOb);
        deletedRequestCacheKey.push('deleted');
        var deleted = CacheService.get(deletedRequestCacheKey);
        if (deleted) {
            deferred.reject({status: 410, data: {recentVersionOfElement: deleted}, message: 'Deleted'});
            return deferred.promise;
        }
        inProgress[key] = deferred.promise;

        HttpService.get(url,
            function(data, status, headers, config) {
                if (angular.isArray(data.elements) && data.elements.length > 0) {
                    deferred.resolve(cacheElement(reqOb, data.elements[0]));
                } else {
                    deferred.reject({status: 500, data: '', message: "Server Error: empty response"}); //TODO 
                }
                delete inProgress[key];
            },
            function(data, status, headers, config) {
                if (data.deleted && data.deleted.length > 0 && data.deleted[0].id === reqOb.elementId) {
                    data.recentVersionOfElement = data.deleted[0];
                    cacheDeletedElement(reqOb, data.deleted[0]);
                }
                URLService.handleHttpStatus(data, status, headers, config, deferred);
                delete inProgress[key];
            },
            weight
        );
        return deferred.promise;
    };

    /**
     * @ngdoc method
     * @name mms.ElementService#getElements
     * @methodOf mms.ElementService
     * 
     * @description
     * Same as getElement, but for multiple ids.
     * 
     * @param {object} reqOb keys - {projectId, refId, elementIds (array of ids), commitId, extended}
     * @param {integer} [weight=1] priority of request (2 is immediate, 1 is normal, 0 is low)
     * @param {boolean} [update=false] (optional) whether to always get the latest 
     *      from server, even if it's already in cache (this will update the cache if exists)
     * @returns {Promise} The promise will be resolved with an array of element objects, 
     *      multiple calls to this method with the same parameters would give the
     *      same objects
     */
    var getElements = function(reqOb, weight, update) {
        var deferred = $q.defer();
        var request = {elements: []};
        var existing = [];
        UtilsService.normalize(reqOb);
        for (var i = 0; i < reqOb.elementIds.length; i++) {
            var id = reqOb.elementIds[i];
            var requestCacheKey = getElementKey(reqOb, id);
            var exist = CacheService.get(requestCacheKey);
            if (exist && !update && (!reqOb.extended || (reqOb.extended && exist._qualifiedId))) {
                existing.push(exist);
                continue;
            }
            request.elements.push({id: id});
        }
        if (request.elements.length === 0) {
            deferred.resolve(existing);
            return deferred.promise;
        }
        $http.put(URLService.getPutElementsURL(reqOb), request)
        .then(function(response) {
            var data = response.data.elements;
            var i;
            if (data && data.length > 0) {
                for (i = 0; i < data.length; i++) {
                    existing.push(cacheElement(reqOb, data[i]));
                }
            }
            var deleted = response.data.deleted;
            if (deleted && deleted.length > 0) {
                for (i = 0; i < deleted.length; i++) {
                    cacheDeletedElement(reqOb, deleted[i]);
                }
            }
            deferred.resolve(existing);
        }, function(response) {
            URLService.handleHttpStatus(response.data, response.status, response.headers, response.config, deferred);
        });
        return deferred.promise;
    };

    /**
     * @ngdoc method
     * @name mms.ElementService#cacheElement
     * @methodOf mms.ElementService
     * 
     * @description
     * handles caching of element objects - in case the metadata of reqOb is different
     * from the element's canonical projectId/refId/commitId (due to being requested 
     * from a different project context), it'll become an alias
     * 
     * @param {object} reqOb request keys - {projectId, refId, elementId, commitId, extended}
     * @param {object} elementOb object to cache
     * @param {boolean} [edit=false] whether object to cache is for editing
     * @returns {object} cached object
     */
    var cacheElement = function(reqOb, elementOb, edit) {
        var result = UtilsService.cleanElement(elementOb, edit);
        var requestCacheKey = getElementKey(reqOb, result.id, edit);
        var origResultCommit = result._commitId;
        if (reqOb.commitId === 'latest') {
            var resultCommitCopy = JSON.parse(JSON.stringify(result));
            result._commitId = 'latest'; //so realCacheKey is right later
            var commitCacheKey = UtilsService.makeElementKey(resultCommitCopy); //save historic element
            if (!edit) {
                CacheService.put(commitCacheKey, resultCommitCopy, true);
            }
        }
        var realCacheKey = UtilsService.makeElementKey(result, edit);
        result._commitId = origResultCommit; //restore actual commitId
        if (angular.equals(realCacheKey, requestCacheKey)) {
            result = CacheService.put(requestCacheKey, result, true);
        } else {
            CacheService.put(requestCacheKey, realCacheKey.join('|'));
            result = CacheService.put(realCacheKey, result, true);
        }
        return result;
    };

    var cacheDeletedElement = function(reqOb, deletedOb) {
        var requestCacheKey = getElementKey(reqOb, deletedOb.id);
        requestCacheKey.push('deleted');
        var commitCacheKey = UtilsService.makeElementKey(deletedOb);
        CacheService.put(requestCacheKey, commitCacheKey.join('|'));
        CacheService.put(commitCacheKey, deletedOb, true);
    };

    /**
     * @ngdoc method
     * @name mms.ElementService#getElementForEdit
     * @methodOf mms.ElementService
     * 
     * @description
     * Gets an element object to edit by id. (this is different from getElement in 
     * that the element is a clone and not the same reference. The rationale is to
     * consider angular data bindings so editing an element does not cause unintentional
     * updates to other parts of the view, separating reads and edits)
     * 
     * ## Example
     *  <pre>
        ElementService.getElementForEdit(reqOb).then(
            function(editableElement) {
                editableElement.name = 'changed name'; //immediately change a name and save
                ElementService.updateElement(editableElement).then(
                    function(updatedElement) { //at this point the regular getElement would show the update
                        alert('updated');
                    },
                    function(reason) {
                        alert('update failed');
                    }
                );
            },
            function(reason) {
                alert('get element failed: ' + reason.message);
            }
        );
        </pre>
     * 
     * @param {object} reqOb see description of getElement.
     * @param {integer} [weight=1] priority
     * @param {boolean} [update=false] update from server
     * @returns {Promise} The promise will be resolved with the element object, 
     *      multiple calls to this method with the same id would result in 
     *      references to the same object. This object can be edited without
     *      affecting the same element object that's used for displays
     */
    var getElementForEdit = function(reqOb, weight, update) {
        UtilsService.normalize(reqOb);
        var requestCacheKey = getElementKey(reqOb, reqOb.elementId, true);
        var key = URLService.getElementURL(reqOb) + 'edit';
        if (inProgress.hasOwnProperty(key)) {
            return inProgress[key];
        }
        var deferred = $q.defer();
        var cached = CacheService.get(requestCacheKey);
        if (cached && !update) {
            deferred.resolve(cached);
            return deferred.promise;
        }
        inProgress[key] = deferred.promise;
        getElement(reqOb, weight, update)
        .then(function(result) {
            var copy = JSON.parse(JSON.stringify(result));
            deferred.resolve(cacheElement(reqOb, copy, true));
        }, function(reason) {
            deferred.reject(reason);
        }).finally(function() {
            delete inProgress[key];
        });
        return deferred.promise;
    };

    /**
     * @ngdoc method
     * @name mms.ElementService#getOwnedElements
     * @methodOf mms.ElementService
     * 
     * @description
     * Gets element's owned element objects. TBD (stub)
     * 
     * @param {object} reqOb see description of getElement, add 'depth' key.
     * @param {integer} [weight=1] priority
     * @param {boolean} [update=false] update from server
     * @returns {Promise} The promise will be resolved with an array of 
     * element objects 
     */
    var getOwnedElements = function(reqOb, weight, update) {
        UtilsService.normalize(reqOb);
        if (!reqOb.depth) {
            reqOb.depth = -1;
        }
        return getGenericElements(URLService.getOwnedElementURL(reqOb), reqOb, 'elements', weight, update);
    };

    /**
     * @ngdoc method
     * @name mms.ElementService#getGenericElements
     * @methodOf mms.ElementService
     *
     * @description
     * This is a method to call a predefined url that returns elements json.
     * A key provides the key of the json that has the elements array. 
     *
     * @param {string} url the url to get
     * @param {object} reqOb see description of getElement.
     * @param {string} jsonKey json key that has the element array value
     * @param {integer} [weight=1] priority
     * @param {boolean} [update=false] update from server
     */
    var getGenericElements = function(url, reqOb, jsonKey, weight, update) {
        UtilsService.normalize(reqOb);
        if (inProgress.hasOwnProperty(url)) {
            HttpService.ping(url, weight);
            return inProgress[url];
        }
        var deferred = $q.defer();
        inProgress[url] = deferred.promise;
        
        HttpService.get(url,
            function(data, status, headers, config) {
                var results = [];
                var elements = data[jsonKey];
                for (var i = 0; i < elements.length; i++) {
                    var element = elements[i];
                    if (!element) {//check for possible null
                        continue;
                    }
                    results.push(cacheElement(reqOb, element));
                }
                delete inProgress[url];
                deferred.resolve(results);
            },
            function(data, status, headers, config) {
                URLService.handleHttpStatus(data, status, headers, config, deferred);
                delete inProgress[url];
            },
            weight
        );
        return deferred.promise;
    };

    //called by updateElement, fills in all keys for element to be updated
    //will also send any cached edited field for the element to be updated
    var fillInElement = function(elementOb) {
        /*
        var deferred = $q.defer();
        getElement({
            projectId: elementOb._projectId,
            elementId: elementOb.id,
            commitId: 'latest',
            refId: elementOb._refId
        }, 2)
        .then(function(data) {
        */
            var ob = JSON.parse(JSON.stringify(elementOb)); //make a copy
            ob._commitId = 'latest';
            var editOb = CacheService.get(UtilsService.makeElementKey(ob, true));
            //for (var key in elementOb) {
            //    ob[key] = elementOb[key];
            //}
            if (editOb) {
                for (var key in editOb) {
                    if (!elementOb.hasOwnProperty(key)) {
                        ob[key] = editOb[key];
                    }
                }
            }
            if (ob._displayedElementIds) {
                delete ob._displayedElementIds;
            }
            if (ob._allowedElementIds) {
                delete ob._allowedElementIds;
            }
            if (ob._childViews && !elementOb._childViews) {
                delete ob._childViews;
            }
            delete ob._commitId;
            return ob;
        /*
            deferred.resolve(ob);
        }, function() {
            deferred.resolve(elementOb);
        });
        return deferred.promise;
        */
    };

    /**
     * @ngdoc method
     * @name mms.ElementService#updateElement
     * @methodOf mms.ElementService
     * 
     * @description
     * Save element to mms and update the cache if successful, the element object
     * must have an id, and whatever property that needs to be updated.
     * 
     * {@link mms.ElementService#methods_getElementForEdit see also getElementForEdit}
     *
     * @param {object} elementOb An object that contains _projectId, _refId, sysmlId and any property changes to be saved.
     * @returns {Promise} The promise will be resolved with the updated cache element reference if 
     *      update is successful. If a conflict occurs, the promise will be rejected with status of 409
     */
    var updateElement = function(elementOb, returnChildViews) { //elementOb should have the keys needed to make url

        var deferred = $q.defer();
        var handleSuccess = function(data) {
            var e = null;
            if (data.elements.length > 1 && elementOb.id) {
                for (var i = 0; i < data.elements.length; i++) {
                    if (data.elements[i].id === elementOb.id) {
                        e = data.elements[i];
                    }
                }
                if (!e) {//TODO shouldn't happen
                    e = data.elements[0];
                }
            } else {
                e = data.elements[0];
            }
            var metaOb = {
                projectId: e._projectId,
                refId: e._refId,
                commitId: 'latest',
                elementId: e.id
            };
            var resp = cacheElement(metaOb, e);
            var editCopy = JSON.parse(JSON.stringify(e));
            cacheElement(metaOb, editCopy, true);
            var history = CacheService.get(['history', metaOb.projectId, metaOb.refId, metaOb.elementId]);
            if (history) {
                history.unshift({_creator: e._modifier, _created: e._modified, id: e._commitId});
            }
            deferred.resolve(resp);
        };

        if (!elementOb.hasOwnProperty('id')) {
            deferred.reject({status: 400, data: '', message: 'Element id not found, create element first!'});
            return deferred.promise;
        }
        var postElem = fillInElement(elementOb);
        //.then(function(postElem) {
            $http.post(URLService.getPostElementsURL({
                    projectId: postElem._projectId,
                    refId: postElem._refId,
                    returnChildViews: returnChildViews
                }), {
                    elements: [postElem],
                    source: ApplicationService.getSource()
                }, {timeout: 60000})
            .then(function(response) {
                var rejected = response.data.rejected;
                if (rejected && rejected.length > 0 && rejected[0].code === 304 && rejected[0].element) { //elem will be rejected if server detects no changes
                    deferred.resolve(rejected[0].element);
                    return;
                }
                if (!angular.isArray(response.data.elements) || response.data.elements.length === 0) {
                    deferred.reject({status: 500, data: '', message: "Server Error: empty response"});
                    return;
                }
                handleSuccess(response.data);
            }, function(response) {
                if (response.status === 409) {
                    var serverOb = response.data.elements[0];
                    UtilsService.cleanElement(serverOb);
                    var origCommit = elementOb._commitId;
                    elementOb._commitId = 'latest';
                    var origOb = CacheService.get(UtilsService.makeElementKey(elementOb));
                    elementOb._commitId = origCommit;
                    if (!origOb) {
                        URLService.handleHttpStatus(response.data, response.status, response.headers, response.config, deferred);
                        return;
                    } 
                    if (!UtilsService.hasConflict(postElem, origOb, serverOb)) {
                        elementOb._read = serverOb._read;
                        elementOb._modified = serverOb._modified;
                        updateElement(elementOb, returnChildViews)
                        .then(function(good){
                            deferred.resolve(good);
                        }, function(reason) {
                            deferred.reject(reason);
                        });
                    } else {
                        URLService.handleHttpStatus(response.data, response.status, response.headers, response.config, deferred);
                    }
                } else
                    URLService.handleHttpStatus(response.data, response.status, response.headers, response.config, deferred);
            });
        //}); 
        return deferred.promise;
    };

    /**
     * @ngdoc method
     * @name mms.ElementService#updateElements
     * @methodOf mms.ElementService
     *
     * @description
     * Save elements to alfresco and update the cache if successful.
     *
     * @param {Array.<Object>} elementObs, array of element objects that contains element id and any property changes to be saved.
     * @param {boolean} returnChildViews, whether to include childViews
     * @returns {Promise} The promise will be resolved with an array of updated element references if
     *      update is successful and will be rejected with an object with the following format:
     *      {failedRequests: list of rejection reasons, successfulRequests: array of updated elements }
     */
    var updateElements = function(elementObs, returnChildViews) {
        var deferred = $q.defer();
        if ( _validate(elementObs) ) {
            var postElements = elementObs.map(function(elementOb) {
                return fillInElement(elementOb);
            });

            var groupOfElements = _groupElementsByProjectIdAndRefId(postElements);
            var promises = [];

            Object.keys(groupOfElements).forEach(function (key) {
                promises.push(_bulkUpdate(groupOfElements[key], returnChildViews));
            });

             // responses is an array of response corresponding to both successful and failed requests with the following format
             // [ { state: 'fulfilled', value: the value returned by the server },
             //   { state: 'rejected', reason: {status, data, message} -- Specified by handleHttpStatus method }
             // ]
            $q.allSettled(promises).then(function(responses) {
                // get all the successful requests
                var successfulRequests = responses.filter(function(response) {
                    return response.state === 'fulfilled';
                });

                var successValues = _.flatten( successfulRequests.map(function(response){
                    return response.value;
                }));

                if ( successfulRequests.length === promises.length ) {
                    // All requests succeeded
                    deferred.resolve(successValues);
                } else {
                    // some requests failed
                    var rejectionReasons = responses.filter(function(response) {
                        return response.state === 'rejected';
                    }).map(function(response) {
                        return response.reason;
                    });

                    // since we could have multiple failed requests when having some successful requests,
                    // reject with the following format so that the client can deal with them at a granular level if
                    // desired
                    deferred.reject({
                        failedRequests: rejectionReasons,
                        successfulRequests: successValues
                    });
                }
            });
        } else {
            deferred.reject( {
                failedRequests: [ { status: 400, data: elementObs, message: 'Some of the elements do not have id, _projectId, _refId' } ],
                successfulRequests: []
            });
        }
        return deferred.promise;
    };

    /**
     * @ngdoc method
     * @name mms.ElementService#createElement
     * @methodOf mms.ElementService
     * 
     * @description
     * Create element on mms.
     * 
     * @param {object} reqOb see description of getElement, instead of elementId, 'element' key should be 
     *                  the element object to create
     * @returns {Promise} The promise will be resolved with the created element references if 
     *      create is successful.
     */
    var createElement = function(reqOb) {
        UtilsService.normalize(reqOb);
        var deferred = $q.defer();

        var url = URLService.getPostElementsURL(reqOb);
        $http.post(url, {'elements': [reqOb.element], 'source': ApplicationService.getSource()})
        .then(function(response) {
            if (!angular.isArray(response.data.elements) || response.data.elements.length === 0) {
                deferred.reject({status: 500, data: '', message: "Server Error: empty response"});
                return;
            }
            var resp = null;
            if (response.data.elements.length > 1 && reqOb.element.id) {
                for (var i = 0; i < response.data.elements.length; i++) {
                    if (response.data.elements[i].id === reqOb.element.id) {
                        resp = response.data.elements[i];
                    }
                }
                if (!resp) {//shouldn't happen!
                    resp = response.data.elements[0];
                }
            } else {
                resp = response.data.elements[0];
            }
            deferred.resolve(cacheElement(reqOb, resp));
        }, function(response) {
            URLService.handleHttpStatus(response.data, response.status, response.headers, response.config, deferred);
        });
        return deferred.promise;
    };

    /**
     * @ngdoc method
     * @name mms.ElementService#createElements
     * @methodOf mms.ElementService
     * 
     * @description
     * Create elements to alfresco and update the cache if successful.
     * 
     * @param {object} reqOb see description of getElement, instead of elementId, 'elements' key should be 
     *                  the array of element object to create
     * @returns {Promise} The promise will be resolved with an array of created element references if 
     *      create is successful.
     */
    var createElements = function(reqOb) {
        UtilsService.normalize(reqOb);
        var deferred = $q.defer();
        var url = URLService.getPostElementsURL(reqOb);
        $http.post(url, {'elements': reqOb.elements, 'source': ApplicationService.getSource()})
        .then(function(response) {
            if (!angular.isArray(response.data.elements) || response.data.elements.length === 0) {
                deferred.reject({status: 500, data: '', message: "Server Error: empty response"});
                return;
            }
            var results = [];
            for (var i = 0; i < response.data.elements.length; i++) {
                results.push(cacheElement(reqOb, response.data.elements[i]));
                var editCopy = JSON.parse(JSON.stringify(response.data.elements[i]));
                cacheElement(reqOb, editCopy, true);
            }
            deferred.resolve(results);
        }, function(response) {
            URLService.handleHttpStatus(response.data, response.status, response.headers, response.config, deferred);
        });
        return deferred.promise;
    };

    /**
     * @ngdoc method
     * @name mms.ElementService#isCacheOutdated
     * @methodOf mms.ElementService
     *
     * @description
     * Checks if the current cached element has been updated on the server, does not update the cache. 
     * If the element doesn't exist in the cache, it's considered not outdated
     *
     * @param {object} reqOb see description of getElement
     * @returns {Promise} Resolved with {status: false} if cache is up to date, 
     *      Resolved with {status: true, server: server element, cache: cache element} if cache is outdated
     */
    var isCacheOutdated = function(reqOb) {//TODO
        var deferred = $q.defer();
        deferred.resolve({status: false});
        /*var ws = !workspace ? 'master' : workspace;
        var orig = CacheService.get(UtilsService.makeElementKey(id, ws, null, false));
        if (!orig) {
            deferred.resolve({status: false});
            return deferred.promise;
        }
        $http.get(URLService.getElementURL(id, ws, 'latest'))
        .success(function(data, status, headers, config) {
            var server = _.cloneDeep(data.elements[0]);
            delete server._modified;
            delete server._read;
            delete server._creator;
            UtilsService.cleanElement(server);
            var current = _.cloneDeep(orig);
            delete current._modified;
            delete current._read;
            delete current._creator;
            UtilsService.cleanElement(current);
            if (angular.equals(server, current)) {
                deferred.resolve({status: false});
            } else {
                deferred.resolve({status: true, server: data.elements[0], cache: orig});
            }
        }).error(function(data, status, headers, config) {
            URLService.handleHttpStatus(data, status, headers, config, deferred);
        });*/
        return deferred.promise;
    };

    /**
     * @ngdoc method
     * @name mms.ElementService#search
     * @methodOf mms.ElementService
     * 
     * @description
     * Search for elements based on some query
     * 
     * @param {object} reqOb see description of getElement
     * @param {object} query JSON object with Elastic query format
     * @param {integer} [weight=1] priority
     * @returns {Promise} The promise will be resolved with an array of element objects.
     *                  The element results returned will be a clone of the original server response and not cache references
     */
    var search = function(reqOb, query, weight) {
        UtilsService.normalize(reqOb);
        var url = URLService.getElementSearchURL(reqOb);
        var deferred = $q.defer();
        $http.post(url, query)
            .then(function(data) {
                //var result = [];
                //for (var i = 0; i < data.data.elements.length; i++) {
                //    var element = data.data.elements[i];
                //    var cacheE = cacheElement(reqOb, element);
                //    var toAdd = JSON.parse(JSON.stringify(element)); //make clone
                //    toAdd._relatedDocuments = cacheE._relatedDocuments;
                //    result.push(toAdd);
                //}
                //deferred.resolve(result);
                deferred.resolve(data.data);
            }, function(data) {
                URLService.handleHttpStatus(data.data, data.status, data.headers, data.config, deferred);
            });
        return deferred.promise;
    };

    /**
     * @ngdoc method
     * @name mms.ElementService#getElementVersions
     * @methodOf mms.ElementService
     * 
     * @description
     * Queries for an element's entire version history
     *
     * @param {object} reqOb see getElement
     * @param {integer} [weight=1] priority
     * @param {boolean} [update=false] update from server
     * @returns {Promise} The promise will be resolved with an array of commit objects.
     */
    var getElementHistory = function(reqOb, weight, update) {
        UtilsService.normalize(reqOb);

        var key = URLService.getElementHistoryURL(reqOb);
        if (inProgress.hasOwnProperty(key)) {
            return inProgress[key];
        }
        var requestCacheKey = ['history', reqOb.projectId, reqOb.refId, reqOb.elementId];
        var deferred = $q.defer();
        if (CacheService.exists(requestCacheKey) && !update) {
            deferred.resolve(CacheService.get(requestCacheKey));
            return deferred.promise;
        }
        inProgress[key] = deferred.promise;
        $http.get(URLService.getElementHistoryURL(reqOb))
        .then(function(response){
            deferred.resolve(CacheService.put(requestCacheKey, response.data.commits, true));
            delete inProgress[key];
        }, function(response) {
            URLService.handleHttpStatus(response.data, response.status, response.headers, response.config, deferred);
            delete inProgress[key];
        });
        return deferred.promise;
    };

    var getElementKey = function(reqOb, id, edit) {
        var cacheKey = UtilsService.makeElementKey({
            _projectId: reqOb.projectId,
            id: id ? id : reqOb.elementId,
            _commitId: reqOb.commitId,
            _refId: reqOb.refId
        }, edit);
        return cacheKey;
    };

    var reset = function() {
        inProgress = {};
    };

    function _groupElementsByProjectIdAndRefId(elementObs) {
        return _.groupBy(elementObs, function(element) {
            return element._projectId + '|' + element._refId;
        });
    }

    function _createMetaOb(element) {
        return {
            projectId: element._projectId,
            refId: element._refId,
            commitId: 'latest',
            elementId: element.id
        };
    }

    function _validate(elementObs) {
        return _.every( elementObs, function( elementOb ) {
            return elementOb.hasOwnProperty('id') && elementOb.hasOwnProperty('_projectId') && elementOb.hasOwnProperty('_refId');
        });
    }

    function _bulkUpdate(elements, returnChildViews) {
        var deferred = $q.defer();
        $http.post(URLService.getPostElementsURL({
            projectId: elements[0]._projectId,
            refId: elements[0]._refId,
            returnChildViews: returnChildViews
        }), {
            elements: elements,
            source: ApplicationService.getSource()
        }, {timeout: 60000})
            .then(function (response) {
                _bulkUpdateSuccessHandler(response, deferred);
            }, function (response) {
                _bulkUpdateFailHandler(response, deferred, elements);
            });
        return deferred.promise;
    }

    function _bulkUpdateSuccessHandler(serverResponse, deferred) {
        var results = [];
        var elements = serverResponse.data.elements;
        elements.forEach(function (e) {
            var metaOb = _createMetaOb(e);
            var editCopy = JSON.parse(JSON.stringify(e));
            results.push(cacheElement(metaOb, e));

            cacheElement(metaOb, editCopy, true);

            var history = CacheService.get(['history', metaOb.projectId, metaOb.refId, metaOb.elementId]);
            if (history) {
                history.unshift({_creator: e._modifier, _created: e._modified, id: e._commitId});
            }
        });
        var rejected = serverResponse.data.rejected;
        if (rejected && rejected.length > 0) {
            rejected.forEach(function(e) {
                if (e.code === 304 && e.element) {
                    results.push(e.element); //add any server rejected elements because they haven't changed
                }
            });
        }
        deferred.resolve(results);
    }

    /** For now, not doing anything special when there is a "conflict" error **/
    function _bulkUpdateFailHandler(response, deferred, elementObs) {
        // for now the server doesn't return anything for the data properties, so override with the input
        response.data = elementObs;
        URLService.handleHttpStatus(response.data, response.status, response.headers, response.config, deferred);
    }
/*
    function _getLatestVersionOfElement(reqOb) {
        var deferred = $q.defer();
        getElementHistory(reqOb).then(function(elementHistory) {
            if (elementHistory.length > 1) {
                // Index 0 is the deletion commit, 0 index is the the commit before deletion
                var commitBeforeDelete = elementHistory[1];
                reqOb.commitId = commitBeforeDelete.id;
                reqOb.includeRecentVersionElement = false;
                getElement(reqOb).then(function(element) {
                    deferred.resolve(element);
                }, deferred.reject);
            } else {
                // this case is not possible coz this method should only be called if the element is already deleted
                // ( and with that there will be at least two commits, one for the add at the very beginning and one for the deletion )
                deferred.reject();
            }
        }, deferred.reject);
        return deferred.promise;
    }
*/
    return {
        getElement: getElement,
        getElements: getElements,
        getElementForEdit: getElementForEdit,
        getOwnedElements: getOwnedElements,
        updateElement: updateElement,
        updateElements: updateElements,
        createElement: createElement,
        createElements: createElements,
        fillInElement: fillInElement,
        getGenericElements: getGenericElements,
        getElementHistory: getElementHistory,
        isCacheOutdated: isCacheOutdated,
        cacheElement: cacheElement,
        search: search,
        reset: reset
    };
}