'use strict';

angular.module('mms')
.factory('StompService', ['$rootScope', 'UtilsService', '$window', '$location','ApplicationService', 'CacheService', 'URLService','$http', StompService]);

/**
 * @ngdoc service
 * @name mms.StompService
 * @requires _
 *
 * @description
 * Provides messages from the activemq JMS bus
 */
function StompService($rootScope, UtilsService, $window, $location, ApplicationService, CacheService, URLService, $http) {
     var stompClient = {};
     var host;

    $http.get(URLService.getJMSHostname()).then(function successCallback(response) {
        if(response.data.connections[0].hasOwnProperty("uri")){
            var removeProtocol = response.data.connections[0].uri.replace(/.*?:\/\//g, "");
            host = 'wss://' + removeProtocol.substring(0, removeProtocol.length-6) + ':61614';
            stompConnect();
        }else{
            console.log('JSON does not contain the right key.  STOMP failed.');
        }
    }, function errorCallback(failed) {
        console.log("failed to connect to the JMS:  " + failed.status);
    });

    var stompSuccessCallback = function(message){
        var updateWebpage = angular.fromJson(message.body);
        var workspaceId = updateWebpage.workspace2.id;
        if(updateWebpage.source !== ApplicationService.getSource()){
            $rootScope.$apply( function(){
                if(updateWebpage.workspace2.addedElements && updateWebpage.workspace2.addedElements.length > 0){
                    angular.forEach( updateWebpage.workspace2.addedElements, function(value, key) {
                        // check if element is in the cache, if not ignore
                        //var ws = !workspace ? 'master' : workspace;
                        var inCache = CacheService.exists( UtilsService.makeElementKey(value.sysmlid, workspaceId, 'latest', false) );
                        if(inCache === true)
                            UtilsService.mergeElement(value, value.sysmlid, workspaceId, false, "all" );
                        $rootScope.$broadcast("stomp.element", value, workspaceId, value.sysmlid , value.modifier, value.name);
                    });
                }
                if(updateWebpage.workspace2.updatedElements && updateWebpage.workspace2.updatedElements.length > 0){
                    angular.forEach( updateWebpage.workspace2.updatedElements, function(value, key) {
                        //var affectedIds = value.affectedIds;
                        var inCache = CacheService.exists( UtilsService.makeElementKey(value.sysmlid, workspaceId, 'latest', false) );
                        if(inCache === true && $rootScope.veEdits && $rootScope.veEdits['element|' + value.sysmlid + '|' + workspaceId] === undefined)
                            UtilsService.mergeElement(value, value.sysmlid, workspaceId, false, "all" );
                        var history = CacheService.get(UtilsService.makeElementKey(value.sysmlid, workspaceId, 'versions'));
                        if (history)
                            history.unshift({modifier: value.modifier, timestamp: value.modified});
                        $rootScope.$broadcast("stomp.element", value, workspaceId, value.sysmlid , value.modifier, value.name);
                    });
                }
            });
        }
        if(updateWebpage.workspace2.addedJobs  && updateWebpage.workspace2.addedJobs.length > 0 ){//check length of added jobs > 0
            var newJob = updateWebpage.workspace2.addedJobs;
            $rootScope.$broadcast("stomp.job", newJob);
        }
        if(updateWebpage.workspace2.updatedJobs  && updateWebpage.workspace2.updatedJobs.length > 0 ){//check length of added jobs > 0
            var updateJob = updateWebpage.workspace2.updatedJobs;
            $rootScope.$broadcast("stomp.updateJob", updateJob);
        }
        if(updateWebpage.workspace2.deletedJobs  && updateWebpage.workspace2.deletedJobs.length > 0 ){//check length of added jobs > 0
            var deleteJob = updateWebpage.workspace2.deletedJobs;
            $rootScope.$broadcast("stomp.deleteJob", deleteJob);
        }
        // this should happen in where...
        $rootScope.$on('$destroy', function() {
            stompClient.unsubscribe('/topic/master'/*, whatToDoWhenUnsubscribe*/);
        });
    };
    var stompFailureCallback = function(error){
        console.log('STOMP: ' + error);
        stompConnect();
        console.log('STOMP: Reconecting in 10 seconds');
    };
    var stompConnect = function(){
        stompClient = Stomp.client(host);
        stompClient.debug = null;
        stompClient.connect("guest", "guest", function(){ // on success
            stompClient.subscribe("/topic/master", stompSuccessCallback );
        }, stompFailureCallback, '/');
    };

     return {

     };
 }
