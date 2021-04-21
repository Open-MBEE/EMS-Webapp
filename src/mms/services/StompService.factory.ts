// import * as Stomp from 'stompjs';
// import * as angular from "angular";
// var mms = angular.module('mms');
//
//
// mms.factory('StompService', ['$rootScope', 'ApplicationService', 'ElementService', 'URLService','$http', 'UtilsService', 'CacheService', '_', StompService]);
//
// /**
//  * @ngdoc service
//  * @name mms.StompService
//  * @requires _
//  *
//  * @description
//  * Provides messages from the activemq JMS bus
//  */
// function StompService($rootScope, ApplicationService, ElementService, URLService, $http, UtilsService, CacheService, _) {
//      var stompClient = {};
//      var host;
//
//     $http.get(URLService.getJMSHostname(),URLService.getRequestConfig()).then(function successCallback(response) {
//         if(response.data.connections[0].hasOwnProperty("uri")){
//             var removeProtocol = response.data.connections[0].uri.replace(/.*?:\/\//g, "");
//             host = 'wss://' + removeProtocol.substring(0, removeProtocol.length-6) + ':61614';
//             stompConnect();
//         }else{
//             console.log('JSON does not contain the right key.  STOMP failed.');
//         }
//     }, function errorCallback(failed) {
//         console.log("failed to connect to the JMS:  " + failed.status);
//     });
//
//     var stompSuccessCallback = function(message) {
//         var updateWebpage = angular.fromJson(message.body);
//         var projectId = message.headers.projectId;
//         var refId = message.headers.refId;
//         refId = !refId ? 'master' : refId;
//         if (updateWebpage.source !== ApplicationService.getSource()) {
//             if (updateWebpage.refs) {
//                 if (updateWebpage.refs.updatedElements && updateWebpage.refs.updatedElements.length > 0) {
//                     angular.forEach(updateWebpage.refs.updatedElements, function (eltId) {
//                         // if (eltId.startsWith("PMA")) {
//                         //     $rootScope.$broadcast("stomp.job", eltId);
//                         // }
//                         var key = UtilsService.makeElementKey({_projectId: projectId, _refId: refId, id: eltId});
//                         if (!CacheService.exists(key)) {
//                             return;
//                         }
//                         ElementService.getElement({
//                             projectId: projectId,
//                             refId: refId,
//                             extended: true,
//                             elementId: eltId
//                         }, 1, true).then(function (data) {
//                             $rootScope.$broadcast("element.updated", data, null, true);
//                         });
//                     });
//                 }
//             }
//         }
//         if (updateWebpage.createdRef) {
//             var createdRef = updateWebpage.createdRef;
//             var list = CacheService.get(['refs', projectId]);
//             var index = -1;
//             if (list) {
//                 index = _.findIndex(list, {id: createdRef.id});
//                 if ( index > -1 ) {
//                     Object.assign(list[index], createdRef);
//                 } else {
//                     list.push(createdRef);
//                 }
//             }
//             CacheService.put(['ref', projectId, createdRef.id], createdRef);
//             $rootScope.$broadcast("stomp.branchCreated", createdRef, projectId);
//         }
//         if (updateWebpage.updatedJobs) {
//             var updateJob = updateWebpage.updatedJobs;
//             $rootScope.$broadcast("stomp.updateJob", updateJob);
//         }
//
//         // this should happen in where...
//         $rootScope.$on('$destroy', function() {
//             (<Stomp.Client>stompClient).unsubscribe() //'/topic/master'/*, whatToDoWhenUnsubscribe*/);
//         });
//     };
//
//     var stompFailureCallback = function(error) {
//         console.log('STOMP: ' + error);
//         stompConnect();
//         console.log('STOMP: Reconnecting in 10 seconds');
//     };
//
//     var stompConnect = function(){
//         stompClient = Stomp.client(host);
//         (<Stomp.Client>stompClient).debug = null;
//         (<Stomp.Client>stompClient).connect("guest", "guest", function(){ // on success
//             (<Stomp.Client>stompClient).subscribe("/topic/master", stompSuccessCallback );
//         }, stompFailureCallback, '/');
//     };
//
//      return {
//
//      };
//  }
