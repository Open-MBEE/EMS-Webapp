import * as angular from "angular";
var mms = angular.module('mms');


mms.factory('JobService', ['$q', '$http', '$location', 'URLService', 'CacheService', 'AuthService', '_', JobService]);

/**
 * @ngdoc service
 * @name mms.JobService
 * @requires $q
 * @requires $http
 * @requires $location
 * @requires mms.URLService
 * @requries mms.CacheService
 * 
 * @description
 * This service handles VE jobs- creation, running, ...
 */
function JobService($q, $http, $location, URLService, CacheService, AuthService, _) {

    var serverSentPMA = '';
    var host = $location.host();
    if (host != 'localhost' && host != '0.0.0.0') {
        var segments = host.split('-');
        if (segments.length === 1) {
            URLService.setJobsUrl('https://cae-pma.jpl.nasa.gov');
        } else {
            var env = segments[segments.length-1];
            URLService.setJobsUrl('https://cae-pma-' + env);
        }
        serverSentPMA = host;
    } else {
        //use default pma //TODO need to define env var when running dev// TODO create porxy in gruntfile for PMA
        URLService.setJobsUrl('https://cae-pma-test.jpl.nasa.gov');
        serverSentPMA = 'opencae-test.jpl.nasa.gov';
    }

    /**
     * @ngdoc method
     * @name mms.JobService#runJob
     * @methodOf mms.JobService
     * 
     * @description
     * Run job
     * 
     * @param {object} jobRunOb {id: jobId, post: {all params needed for running job}}
     * @param {string} projectId Project Id
     * @param {string} refId Ref Id
     * @returns {Promise} The promise will be resolved with the job instance
     */
    var runJob = function (jobRunOb, projectId, refId) {
        var deferred = $q.defer();
        var link = URLService.getRunJobURL(projectId, refId, jobRunOb.id);
        var post = {
            "mmsServer" : serverSentPMA,
            "alfrescoToken" : AuthService.getToken()
        };
        if (jobRunOb.post) {
            _.merge(post, jobRunOb.post);
        }
        $http.post(link, post, URLService.getRequestConfig()).then(function(data) {
            deferred.resolve(data.data.jobInstances);
        }, function(error) {
            deferred.reject(error);
        });
        return deferred.promise;
    };


    /**
     * @ngdoc method
     * @name mms.JobService#getJobs
     * @methodOf mms.JobService
     * 
     * @description
     * Get all the jobs for current document
     * 
     * @param {string} docId Document Id
     * @param {string} projectId Project Id
     * @param {string} refId Ref Id
     * @returns {Promise} The promise will be resolved with list of jobs
     */
    var getJobs = function (docId, projectId, refId) {
        var deferred = $q.defer();
        var link = URLService.getJobsURL(projectId, refId, serverSentPMA);
        var docJobs = [];
        $http.get(link,URLService.getRequestConfig()).then(function(data) {
            var jobs;
            if (data.data.jobs) {
                jobs = data.data.jobs;
                for (var i = 0; i < jobs.length; i++) {
                    if (jobs[i].associatedElementID === docId) {
                        docJobs.push(jobs[i]);
                    }
                }
            }
            deferred.resolve(docJobs);
        }, function(error) {
            deferred.reject(error);
        });
        return deferred.promise;
    };

    /**
     * @ngdoc method
     * @name mms.JobService#getJobInstances
     * @methodOf mms.JobService
     * 
     * @description
     * Get latest instances of job. Need to use history to get past instances/builds.
     * 
     * @param {string} jobId Job Id
     * @param {string} projectId Project Id
     * @param {string} refId Ref Id
     * @returns {Promise} The promise will be resolved with a job instance
     */
    var getJobInstances = function (jobId, projectId, refId) {
        var deferred = $q.defer();
        var link = URLService.getJobInstancesURL(projectId, refId, jobId, serverSentPMA);
        $http.get(link,URLService.getRequestConfig()).then(function(data) {
            deferred.resolve(data.data.jobInstances);
        }, function(error) {
            deferred.reject(error);
        });
        return deferred.promise;
    };

    /**
     * @ngdoc method
     * @name mms.JobService#createJob
     * @methodOf mms.JobService
     * 
     * @description
     * Create new job for doc
     *  <pre>
        JobService.createJob({
            id: 'docId', 
            jobName: 'docName_docmerge', //default ''
            jobType: 'docmerge',         //default 'docgen'
            jobSchedule: '* * * *',      //default ''
        }).then(
            function(job) { 
                alert('created ' + job.name);
            }, 
            function(reason) {
                alert('creation failed: ' + reason.message);
                //see mms.URLService#handleHttpStatus for the reason object
            }
        );
        </pre>
     * 
     * @param {object} jobOb {id: docId, jobName: 'jobName', jobType: 'docmerge/docgen'}
     * @param {string} projectId Project Id
     * @param {string} refId Ref Id
     * @returns {Promise} The promise will be resolved with new job
     */
    var createJob = function(jobOb, projectId, refId) {
        var deferred = $q.defer();
        var id = jobOb.id;
        var jobName = jobOb.jobName;
        var jobType = 'docgen';
        var jobSchedule = '';
        
        if (jobOb.jobType) {
            jobType = jobOb.jobType;
        }
        if (jobOb.jobSchedule) {
            jobSchedule = jobOb.jobSchedule;
        }

        var post = {
            "jobName" : jobName,
            "type" : jobType,
            // "arguments" : ["arg1","arg2"],
            "schedule" : jobSchedule,
            "associatedElementID" : id,
            "mmsServer" : serverSentPMA,
            "alfrescoToken" : AuthService.getToken()
        };

        var link = URLService.getCreateJobURL(projectId, refId);
        $http.post(link, post, URLService.getRequestConfig()).then(function(data) {
            deferred.resolve(data.data.jobs[0]);
        }, function(error) {
            deferred.reject(error);
        });
        return deferred.promise;
    };

    // var createJobCacheKey = function(reqOb) {
    //     var refId = !reqOb.refId ? 'master' : reqOb.refId;
    //     return ['job', reqOb.projectId, refId, reqOb.elementId];
    // };

    return {
        createJob: createJob,
        getJobs: getJobs,
        getJobInstances: getJobInstances,
        runJob: runJob
    };

}