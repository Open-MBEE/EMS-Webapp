'use strict';

angular.module('mms.directives')
.directive('mmsJobs', ['$templateCache', '$http', '$location', '$window', 'growl', '_', '$q', '$rootScope',
        'AuthService', 'ElementService', 'ProjectService', 'UtilsService', 'JobService', 'PermissionsService', mmsJobs]);
/**
 * @ngdoc directive
 * @name mms.directives.directive:mmsJobs
 *
 * @requires $templateCache
 * @requires $http
 * @requires $location
 * @requires _
 *
 * @restrict E
 *
 * @description
 * Shows you jobs that you have running, going to run and history of jobs.
 * As well as let you edit and add jobs
 *
 * ### template (html)
 * ## Example for showing an element jobs
 *  <pre>
 *   <mms-jobs></mms-jobs>
 * </pre>
 *
 * @param {string=master} mmsBranch Branch to use, defaults to master
 * @param {string=null} mmsDocId the id of the current document under which the job is being run
 */
function mmsJobs($templateCache, $http, $location, $window, growl, _, $q, $rootScope,
        AuthService, ElementService, ProjectService, UtilsService, PermissionsService, JobService) {

    var template = $templateCache.get('mms/templates/mmsJobs.html');
    //:TODO have cases for each null; "running"; "failed"; "completed"; "aborted";"unstable"; "disabled"; "waiting";
    var mmsJobsLink = function (scope, element, attrs) {
        var ran;
        scope.jobs = [];
        scope.jobInstances = {};
        // scope.editorEnabled = false; // Edit name of job
        scope.loadingJobs = false;
        scope.createJobCleared = true; // TODO do we need?
        scope.runCleared = true;
        // scope.deleteCleared = true;
        scope.jobInput = {jobName: ''};
        scope.hasRefArr = false;
        scope.docEditable = false;
        scope.docgenExists = false;

        // Get ref list for project and details on
        var getRefsInProgress = function() {
            ProjectService.getRefs(scope.mmsProjectId)
            .then(function(data) {
                scope.refList = data.filter(function(ref) {
                    if (ref.status === 'creating') {
                        return true;
                    }
                });
            });
        };

        var getJobInstances = function (jobId) {
            scope.loading = true;
            JobService.getJobInstances(jobId, scope.mmsProjectId, scope.mmsRefId)
            .then(function (instances) {
                scope.jobInstances[jobId] = instances;
            }, function(error) {
                scope.jobInstances[jobId] = {jobStatus: 'error getting job'};
            }).finally(function () {
                scope.loading = false;
            });
        };

        // get all the jobs for current document
        var getJobs = function () {
            scope.jobs = [];
            scope.loadingJobs = true;
            JobService.getJobs(scope.mmsDocId, scope.mmsProjectId, scope.mmsRefId)
            .then(function (jobs) {
                for (var i = 0; i < jobs.length; i++) {
                    scope.jobs.push(jobs[i]);
                    getJobInstances(jobs[i].id);
                    if (jobs[i].type === 'docgen') {
                        scope.docgenExists = true;
                    }
                }
            }, function (error) {
                growl.error('There was a error in retrieving your job: ' + error.status);
            }).finally(function () {
                scope.loadingJobs = false;
            });
        };

        //Callback function for document change
        var changeDocument = function (newVal, oldVal) {
            if (!newVal || (newVal == oldVal && ran))
                return;
            ran = true;
            var lastid = newVal;
            var refOb = null;
            getRefsInProgress();
            ProjectService.getRef(scope.mmsRefId, scope.mmsProjectId).then(function(data) {
                refOb = data;
                scope.mmsRefType = refOb.type;
                var reqOb = {elementId: scope.mmsDocId, projectId: scope.mmsProjectId, refId: scope.mmsRefId};
                ElementService.getElement(reqOb, 2, false)
                .then(function (document) {
                    if (newVal !== lastid) {
                        return;
                    }
                    if (!UtilsService.isDocument(document)) {
                        scope.isDoc = false;
                        return;
                    } else {
                        scope.isDoc = true;
                    }
                    scope.doc = document;
                    scope.docName = document.name;
                    // Set job run permissions
                    scope.docEditable = scope.mmsRefType != 'Tag' && PermissionsService.hasBranchEditPermission(refOb);
                    scope.createJobCleared = scope.docEditable;
                    scope.runCleared = scope.docEditable;
                    getJobs();
                });
            });
        };

        // watch for the document to change
        scope.$watch('mmsDocId', changeDocument);

        var runJob = function (id) {
            scope.runCleared = false;
            var jobRunOb = {
                "id" : id
            };

            JobService.runJob(jobRunOb, scope.mmsProjectId, scope.mmsRefId)
            .then(function(data) {
                growl.success('Your job is running!');
            }, function(error) {
                growl.error('Your job failed to run: ' + error.data.message);
            }).finally(function() {
                scope.runCleared = true;
            });
        };

        // logic for running a job immediately
        scope.createJobandRun = function (id) {
            if (!id) {
                createJob().then(function (job) {
                    scope.jobs.push(job);
                    runJob(job.id);
                });
            } else {
                runJob(id);
            }
        };

        // logic for adding a new job
        var createJob = function() {
            var deferred = $q.defer();
            var defaultName = scope.jobInput.jobName;
            scope.createJobCleared = false;
            if (!scope.jobInput.jobName) {
                defaultName = scope.docName + "_DocGen_job";
            }
            var thisSchedule = '';
            // Do we allow users to input schedule??
            // if(scope.myOutput !== '* * * * *' && scope.myOutput)
            //     thisSchedule = scope.myOutput;

            var jobOb = {
                "id": scope.mmsDocId,
                "jobName" : defaultName,
                "jobType" : "docgen",
                "jobSchedule" : thisSchedule,
            };

            JobService.createJob(jobOb, scope.mmsProjectId, scope.mmsRefId)
            .then(function(job) {
                growl.success('Your job has posted');
                scope.docgenExists = true;
                deferred.resolve(job);
            }, function(error) {
                growl.error('Your job failed to post: ' + error.data.message);
            }).finally(function() {
                scope.createJobCleared = true;
            });
            return deferred.promise;
        };

        scope.disableJob = function(jobId) {
        //    var link = URLService.getJobURL(scope.mmsProjectId, scope.mmsRefId, jobId, $location.host());
        //    scope.deleteCleared = false;
        //    $http.delete(link).then(function() {
        //        //TODO remove from jobs list
        //        var indexOfJob = _.findLastIndex(scope.jobs, {id: jobId});
        //        scope.jobs.splice(indexOfJob, 1);
        //        growl.success('Your job has been deleted');
        //     }, function(error){
        //         growl.error('Your job failed to be deleted: ' + error.status);
        //     }).finally(function(){
        //         scope.deleteCleared = true;
        //     });
        };

        scope.changePane = function(pane) {
            $rootScope.$broadcast(pane);
        };

        // actions for stomp
        scope.$on("stomp.updateJob", function(event, updateJob) {
            var jobId = updateJob.jobId;
            if (scope.jobInstances[jobId]){
                scope.jobInstances[jobId] = [updateJob];
            }
        });

        scope.$on("stomp.branchCreated", function(event, updateRef, projectId) {
            getRefsInProgress();
        });
    };
    return {
        restrict: 'E',
        template: template,
        scope: {
            mmsProjectId: '@',
            mmsRefId: '@',
            mmsDocId:'@'
        },
        link: mmsJobsLink
    };
}
