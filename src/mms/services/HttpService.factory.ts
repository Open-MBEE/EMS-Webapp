import * as angular from 'angular'
var mms = angular.module('mms');

mms.factory('HttpService', ['$http', HttpService]);

/**
 * @ngdoc service
 * @name mms.HttpService
 * 
 * @description
 * Provides prioritization and caching for $http service calls
 */
function HttpService($http) {
    
    var queue = {};
    queue[0]= [];//high proirity
    queue[1]=[];//low prority
    var cache = {}; // cache url -> this is a easy key look up
    var inProgress = 0;
    var GET_OUTBOUND_LIMIT = 20; //max number of get requests active
    
    var setOutboundLimit = function(limit){
        GET_OUTBOUND_LIMIT = limit;
    };
    var getOutboundLimit = function() {
        return GET_OUTBOUND_LIMIT;
    };
    var getQueue = function(){
        return queue;
    };

    /**
     * @ngdoc method
     * @name mms.HttpService#get
     * @methodOf mms.HttpService
     * 
     * @description
     * Put a new get request in the queue, the queue is FIFO
     *
     * @param {string} url url to get
     * @param {function} successCallback success function
     * @param {function} errorCallback function
     * @param {string} weight by weight
     * @param {Object} config object containing http configuration parameters
     */
    var get = function(url, successCallback, errorCallback, weight, config?) {
        if(weight === undefined){
            weight = 1;
        }
        var request = { url : url, successCallback: successCallback, errorCallback: errorCallback , weight: weight };
        if (inProgress >= GET_OUTBOUND_LIMIT) {
            if(request.weight === 2){
                $http.get(url,config).then(
                    function(response){successCallback(response.data, response.status, response.headers, response.config);},
                    function(response){errorCallback(response.data, response.status, response.headers, response.config);})
                    .finally(function(){
                        if (cache.hasOwnProperty(url)) {
                            delete cache[url];
                        }
                    });
            }    
            else if(request.weight === 0){
                queue[0].push(request);
            }    
            else{
                queue[1].push(request);
            } 
            if(cache.hasOwnProperty(url)){
                 if(cache[url].weight < request.weight)
                    cache[url].weight = request.weight;
            }
            else {
                cache[url] = request;
            } 
        } 
        else {
            inProgress++;
            cache[url] = request;
            $http.get(url,config).then(
                function(response){successCallback(response.data, response.status, response.headers, response.config);},
                function(response){errorCallback(response.data, response.status, response.headers, response.config);})
                .finally( function() {
                    inProgress--;
                    var next; 
                    if (cache.hasOwnProperty(url)) {
                        delete cache[url];
                    }
                    if (queue[1].length > 0) {
                        next = queue[1].shift();
                        get(next.url, next.successCallback, next.errorCallback, next.weight, next.config);
                    }
                    else if(queue[0].length > 0){
                        next = queue[0].shift();
                        get(next.url, next.successCallback, next.errorCallback, next.weight, next.config);
                    }
                });
        }
    };
    
    /**
     * @ngdoc method
     * @name mms.HttpService#ping
     * @methodOf mms.HttpService
     * 
     * @description
     * If the current queue has an ongoing request, put it in front
     *
     * @param {string} url url to get
     */
    var ping = function(url, weight) { // ping should simply change the weight
        if(weight === undefined){
            weight = 1;
        }
        if (cache.hasOwnProperty(url)) {
            if(weight > cache[url].weight){
                var request = cache[url];
                var index;
                if(request.weight === 0)
                    index= queue[0].indexOf(request);
                else
                    index= queue[1].indexOf(request);
                if(weight === 1 && index !== -1){
                    request.weight = 1;
                    queue[1].push(request);
                    queue[0].splice(index, 1);
                }
                else if(weight === 2 && index !== -1){
                    if(request.weight === 0 ){
                        queue[0].splice(index, 1);
                    }
                    else{
                        queue[1].splice(index, 1);
                    }
                    get(request.url, request.successCallback, request.errorCallback, weight);
                }
            }
        }
    };
    
    /**
     * @ngdoc method
     * @name mms.HttpService#ping
     * @methodOf mms.HttpService
     * 
     * @description Changes all requests in the Queue 1 to Queue 0
     */
    var transformQueue = function(){
        if(queue[1].length > 0) {//will the queue ever be defined?
            for(var i = 0; i < queue[1].length; i++){
                queue[1][i].weight = 0;
                // if(cache.hasOwnProperty(queue[1][i].request.url))
                //     cache[queue[1][i].request.url].weight = 0;
                queue[0].push(queue[1][i]);
                //queue[1][i].shift();
            }
            //queue[0] = queue[0].concat(queue[1]);
            queue[1] = [];
        }
    };

    var dropAll = function() {
        queue[1].length = 0;
        queue[0].length = 0;
        cache = {};
        inProgress = 0;
    };

    return {
        get: get,
        ping: ping,
        setOutboundLimit: setOutboundLimit,
        getOutboundLimit: getOutboundLimit,
        getQueue: getQueue,
        transformQueue: transformQueue,
        dropAll: dropAll
    };

}