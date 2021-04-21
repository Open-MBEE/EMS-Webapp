import * as angular from "angular";
var mmsDirectives = angular.module('mmsDirectives');

mmsDirectives.directive('mmsRefList', ['$templateCache', '$http', 'growl', '_', '$q', '$uibModal',
        'UtilsService', 'JobService', 'ElementService', 'URLService', mmsRefList]);
/**
 * @ngdoc directive
 * @name mmsDirectives.directive:mmsRefList
 *
 * @requires $templateCache
 * @requires $http
 * @requires $location
 * @requires _
 *
 * @restrict E
 *
 * @description
 * Displays a list of branches/tags with details. Provides options for taking action on ref.
 * For the time being it only allows for running a doc merge job on current document.
 *
 * @param {string=master} mmsProjectId Current project
 * @param {string=master} mmsRefId Current branch
 * @param {string=null} mmsDocId the id of the current document
 */
function mmsRefList($templateCache, $http, growl, _ , $q, $uibModal,
    UtilsService, JobService, ElementService, URLService) {

    var template = 'partials/mms-directives/mmsRefList.html';

    var mmsRefListLink = function (scope, element, attrs) {
        var ran;
        scope.showMerge = URLService.getMmsServer().indexOf('opencae.jpl.nasa.gov') == -1;
        scope.runCleared = true;
        scope.docEditable = false;
        scope.currentRefOb = _.find(scope.mmsBranches, { 'id': scope.mmsRefId });
        if (scope.currentRefOb == undefined){
            scope.currentRefOb = _.find(scope.mmsTags, { 'id': scope.mmsRefId });
        }

        // logic for adding a new job
        var createJob = function() {
            var deferred = $q.defer();
            var defaultName = "DocMerge_on_" + scope.docName;
            var jobOb = {
                "id": scope.mmsDocId,
                "jobName" : defaultName,
                "jobType" : "docmerge"
            };

            JobService.createJob(jobOb, scope.mmsProjectId, scope.mmsRefId)
            .then(function(job) {
                deferred.resolve(job);
                growl.success('Creating your job');
            }, function(error) {
                growl.error('Your job failed to post: ' + error.data.message);
            });
            return deferred.promise;
        };

        var runJob = function (id, fromRef, comment) {
            scope.runCleared = false;
            var postOb = {
                "fromRefId": fromRef,
                "comment": comment
            };
            var jobRunOb = {
                "id": id,
                "post": postOb
            };
            JobService.runJob(jobRunOb, scope.mmsProjectId, scope.mmsRefId)
            .then(function(data) {
                // growl.success('Your job is running!');
            }, function(error) {
                growl.error('Your job failed to run: ' + error.data.message);
            // }).finally(function() {
            //     scope.runCleared = true;//TODO clear when stomp gets completed message -use jobservice to handle?
            });
        };

        scope.createJobandRun = function (refId, comment) {
            var deferred = $q.defer();
            // Check if the doc already has a job created
            JobService.getJobs(scope.mmsDocId, scope.mmsProjectId, scope.mmsRefId)
            .then(function (jobs) {
                var jobExists = false;
                var docmergeJobId;
                for (var i = 0; i < jobs.length; i++) {
                    if (jobs[i].associatedElementID === scope.mmsDocId && jobs[i].type === 'docmerge') {
                        // If yes, assign id to run
                        docmergeJobId = jobs[i].id;
                        jobExists = true;
                        break;
                    }
                }
                if (jobExists) {
                    runJob(docmergeJobId, refId, comment);
                } else { // If not, create
                    createJob().then(function(job) {
                        runJob(job.id, refId, comment);
                    });
                }
                deferred.resolve('ok');
            }, function (error) {
                growl.error('There was a error in retrieving your job: ' + error.status);
            });
            return deferred.promise;
        };

        //Callback function for document change
        var changeDocument = function (newVal, oldVal) {
            if (!newVal || (newVal == oldVal && ran))
                return;
            ran = true;
            var reqOb = {elementId: scope.mmsDocId, projectId: scope.mmsProjectId, refId: scope.mmsRefId};
            ElementService.getElement(reqOb, 2, false)
            .then(function (document) {
                if (!UtilsService.isDocument(document)) {
                    scope.isDoc = false;
                    return;
                } else {
                    scope.isDoc = true;
                }
                scope.doc = document;
                scope.docName = document.name;
                scope.docEditable = document._editable && scope.mmsRefType != 'Tag';
            });
        };

        // watch for the document to change
        scope.$watch('mmsDocId', changeDocument);


        scope.docMergeAction = function (srcRef) {
            var templateUrlStr = 'partials/mms-directives/mergeConfirm.html';
            scope.srcRefOb = srcRef;

            var instance = $uibModal.open({
                templateUrl: templateUrlStr,
                scope: scope,
                controller: ['$scope', '$uibModalInstance', '$filter', mergeDocCtrl]
            });
            instance.result.then(function(data) {
                // TODO: do anything here?
            });
        };

        var mergeDocCtrl = function($scope, $uibModalInstance, $filter) {
            $scope.oking = false;
            $scope.commitMessage = '';
            $scope.createForm = true;

            $scope.ok = function() {
                if ($scope.oking) {
                    growl.info("Please wait...");
                    return;
                }
                $scope.oking = true;
                $scope.createJobandRun($scope.srcRefOb.id, $scope.commitMessage)
                .then(function(data) {
                    growl.success("Creating job to merge documents... please see the jobs pane for status updates");
                    $uibModalInstance.close(data);
                }, function(reason) {
                    growl.error("Could not merge document: " + reason.message);
                }).finally(function() {
                    $scope.oking = false;
                });
            };
    
            $scope.cancel = function() {
                $uibModalInstance.dismiss();
            };
        };

        // actions for stomp
        scope.$on("stomp.updateJob", function(event, updateJob) {
            if (updateJob.type === 'docmerge' && updateJob.associatedElementId === scope.mmsDocId && 
                updateJob.refId === scope.mmsRefId && updateJob.jobStatus === 'completed') {
                    growl.success(scope.docName + ' has been merged');
                    scope.runCleared = true; // disable apply until stomp gets completed message
                }
        });


    };
    return {
        restrict: 'E',
        templateUrl: template,
        scope: {
            mmsProjectId: '@',
            mmsRefId: '@',
            mmsRefType: '@',
            mmsDocId:'@',
            mmsBranches: '<',
            mmsTags: '<'
        },
        link: mmsRefListLink
    };
}
