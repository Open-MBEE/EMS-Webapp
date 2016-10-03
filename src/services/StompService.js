'use strict';

angular.module('mms')
.factory('StompService', ['$rootScope', 'UtilsService', '$window', '$location','ApplicationService', 'CacheService', StompService]);

/**
 * @ngdoc service
 * @name mms.StompService
 * @requires _
 *
 * @description
 * Provides messages from the activemq JMS bus
 */
function StompService($rootScope, UtilsService, $window, $location, ApplicationService, CacheService) {
     var stompClient = {};
     var host = $location.host();
     var hostName = 'wss://'+$location.host().split(".")[0]+'-origin.jpl.nasa.gov:61614';
    //  if (host == '127.0.0.1') {
    //     hostName = 'wss://127.0.0.1:61614';
    //  } else if (host == 'localhost') {
    //      hostName = 'wss://localhost:61614';
    //  }

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
        stompClient = Stomp.client(hostName);
        stompClient.debug = null;
        stompClient.connect("guest", "guest", function(){ // on success
            stompClient.subscribe("/topic/master", stompSuccessCallback );
        }, stompFailureCallback, '/');
    };
    //inital connection call
    stompConnect();

     // TODO: server disconnects in sufficiently long enough periods of inactivity
     //"Whoops! Lost connection to " and then reconnect
     //http://stackoverflow.com/questions/22361917/automatic-reconnect-with-stomp-js-in-node-js-application/22403521#22403521
     return {

     };
 }
