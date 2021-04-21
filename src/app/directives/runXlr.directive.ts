import * as angular from 'angular';
var mmsApp = angular.module('mmsApp');


mmsApp.directive('runXlr', ['$http', '$uibModal', '$window', 'growl', 'ApplicationService', runXlr]);

function runXlr($http, $uibModal, $window, growl, ApplicationService) {
    return {
        template: '<button class="btn btn-primary" ng-click="runXLR()">{{xlrTaskName}}</button>',
        scope: {
            templateId: '@',
            xlrTaskName: '@',
            xlrReleaseName: '@'
        },
        controller: ['$scope', runXlrCtrl],
        link: runXlrLink
    };
    function runXlrLink(scope, element, attrs, ctrls) {}

    function runXlrCtrl($scope) {
        var modalOpen = false;
        $scope.xlrTaskName = $scope.xlrTaskName ? $scope.xlrTaskName : 'Sync FN to JPL Network';
        $scope.runXLR = runXLR;
        function runXLR() {

            modalOpen = true;
            $uibModal.open({
                template: '<div class="modal-header"><h4>Please login to {{xlrTaskName}}.</h4></div><div class="modal-body"><form name="loginForm" ng-submit="login(credentials)">' + 
                                '<input type="text" class="form-control" ng-model="credentials.username" placeholder="Username" style="margin-bottom: 1.5em;" autofocus>' + 
                                '<input type="password" class="form-control" ng-model="credentials.password" placeholder="Password" style="margin-bottom: 1.5em;">' + 
                                '<button class="btn btn-block btn-primary" type="submit">LOG IN <span ng-if="spin" ><i class="fa fa-spin fa-spinner"></i>' + 
                            '</span></button></form></div>',
                scope: $scope,
                backdrop: 'static',
                controller: ['$scope', '$uibModalInstance', function ($scope, $uibModalInstance) {
                    $scope.credentials = {
                        username: '',
                        password: ''
                    };
                    $scope.spin = false;

                    function make_base_auth(user, password) {
                        var tok = user + ':' + password;
                        var hash = $window.btoa(tok);
                        return "Basic " + hash;
                    }
                    $scope.login = function (credentials) {
                        $scope.spin = true;
                        var baseAuth = make_base_auth(credentials.username, credentials.password);
                        var email = credentials.username + '@jpl.nasa.gov';
                        var postBody = {
                            "releaseTitle": $scope.xlrReleaseName ? $scope.xlrReleaseName : "CAE Portal Sync",
                            "releaseVariables": {
                                "contentEditor": credentials.username,
                                "editorEmail": email
                            },
                            "autoStart": true
                        };

                        var link = "/xlrapi/v1/templates/Applications/" + $scope.templateId + "/create";
                        var config = {
                            method: 'POST',
                            url: link,
                            headers: {
                                'Authorization': baseAuth,
                                "Content-Type": "application/json",
                                "cache-control": "no-cache",
                            },
                            "data": postBody,
                            "withCredentials": true,
                            "async": true,
                            "crossDomain": true,
                            "processData": false
                        };
                        $http(config).then(function() {
                            growl.success($scope.xlrTaskName + ' is running. You will receive a completion email');
                        }, function(error){
                            growl.error($scope.xlrTaskName + ' has failed.');
                        }).finally(function() {
                            $scope.spin = false;
                            modalOpen = false;
                            $uibModalInstance.dismiss();
                        });
                    };
                }],
                size: 'md'
            }).result.finally(function(){
                modalOpen = false;
            });

        }

    }
}
