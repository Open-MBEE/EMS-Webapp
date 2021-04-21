import * as angular from "angular";
var mms = angular.module('mms');


class URLServiceProvider {
    private baseUrl = '/alfresco/service';
    private mmsUrl = '';

    constructor() {
    };

    setBaseUrl(base) {
        this.baseUrl = base;
    };

    setMmsUrl(mms) {
        this.mmsUrl = mms;
      };

    $get() {
        return urlService(this.baseUrl,this.mmsUrl);
    }
}

mms.provider('URLService', URLServiceProvider)
//     var initInjector = angular.injector(['ng']);
//     var $http = initInjector.get('$http');
//     var $scope = initInjector.get('$scope');
//     var config = $http.get('config/config.json');
//     console.log(config);
//     var blah = $http.get('config/config.json').then(function(conf){$http.get(conf.apiUrl);});
//     console.log(blah);
//     var getConfig = function() {
//       return $http.get('config/config.json');
//     };
//   console.log(baseUrl);
//     var mmsUrl = '';
//     this.setBaseUrl = getConfig().then(
//       function(data) {
//         $scope.config = data;
//         console.log($scope.config);
//     });
//     this.setMmsUrl = function() {
//         $http.get('config/config.json')
//           .then(function(config) {
//             mmsUrl = config.apiUrl;
//           });
//     };
//     this.$get = [function URLServiceFactory() {
//
//         return urlService(baseUrl, mmsUrl);
//     }];
// });


/**
 * @ngdoc service
 * @name mms.URLService
 *
 * @description
 * This utility service gives back url paths for use in other services in communicating
 * with the server, arguments like projectId, refId, commitId are expected to be strings and
 * not null or undefined. This service is usually called by higher level services and
 * should rarely be used directly by applications.
 *
 * To configure the base url of the mms server, you can use the URLServiceProvider
 * in your application module's config. By default, the baseUrl is '/alfresco/service'
 * which assumes your application is hosted on the same machine as the mms and ve.
 *  <pre>
 angular.module('myApp', ['mms'])
 .config(function(URLServiceProvider) {
            URLServiceProvider.setBaseUrl('https://url/alfresco/service');
        });
 </pre>
 * (You may run into problems like cross origin security policy that prevents it from
 *  actually getting the resources from a different server, solution TBD)
 */
function urlService(baseUrl, mmsUrl) {
    var root = baseUrl;
    var mmsServer = mmsUrl;
    var mmsAPIroot = mmsUrl + baseUrl;
    var jobsRoot = 'https://cae-pma-int:8443/';
    var token;

    var getRoot = function() {
        return root;
    };

    var setToken = function(t) {
        token = t;
    };

    var getJMSHostname = function(){
        return mmsAPIroot + '/connection/jms';
    };

    var getMmsServer = function() {
        return mmsServer;
    };

    /**
     * @ngdoc method
     * @name mms.URLService#setHeader
     * @methodOf mms.URLService
     *
     * @description
     * Adds generates Authorization Header using token
     *
     * @returns {object} The HTTP header format
     */
    var getHeaders = function() {
        return {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token
        };
    };

    var getRequestConfig = function() {
        return {headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + token
            }
        };
    };

    /**
     * @ngdoc method
     * @name mms.URLService#isTimestamp
     * @methodOf mms.URLService
     *
     * @description
     * self explanatory
     *
     * @param {string} version A version string or timestamp
     * @returns {boolean} Returns true if the string has '-' in it
     */
    var isTimestamp = function(version) {
        if (!version)
            return false;
        if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}[+]?-\d{4}$/.test(version.trim()))
            return true;
        return false;
    };

    /**
     * @ngdoc method
     * @name mms.URLService#getMmsVersionURL
     * @methodOf mms.URLService
     *
     * @description
     * self explanatory
     *
     * @returns {string} Returns object with mmsversion url
     */
    var getMmsVersionURL = function() {
        return mmsAPIroot + "/api/version";
    };

    /**
     * @ngdoc method
     * @name mms.URLService#getSiteDashboardURL
     * @methodOf mms.URLService
     *
     * @description
     * Gets the path for a site dashboard.
     *
     * @param {string} site Site name (not title!).
     * @returns {string} The path for site dashboard.
     */
    var getSiteDashboardURL = function(site) {
        return mmsAPIroot + "/orgs/" + site + "/projects/" + site + "/branches/master/elements";
    };

    /**
     * @ngdoc method
     * @name mms.URLService#getExportHtmlUrl
     * @methodOf mms.URLService
     *
     * @description
     * Gets url that to convert HTML to PDF or Word
     * @param {string} projectId id of the project
     * @param {string} refId id of the ref
     * @returns {string} The url
     */
    var getExportHtmlUrl = function(projectId, refId) {
        return mmsAPIroot + "/projects/" + projectId +
            "/refs/" + refId + '/convert';
    };

    /**
     * @ngdoc method
     * @name mms.URLService#getCheckLoginURL
     * @methodOf mms.URLService
     *
     * @description
     * Gets url that checks the login
     *
     * @returns {string} The url
     */
    var getCheckLoginURL = function() {
        return mmsAPIroot + "/checklogin";
    };

    var getOrgURL = function(orgId) {
        return mmsAPIroot + '/orgs/' + orgId;
    };

    var getOrgsURL = function() {
        return mmsAPIroot + "/orgs";
    };

    var getProjectsURL = function(orgId) {
        if (orgId)
            return mmsAPIroot + "/orgs/" + orgId + '/projects';
        return mmsAPIroot + '/projects';
    };

    var getProjectURL = function(projectId) {
        return mmsAPIroot + "/projects/" + projectId;
    };

    var getProjectMountsURL = function(projectId, refId) {
        return mmsAPIroot + '/projects/' + projectId + '/refs/' + refId + '/mounts';
    };

    var getRefsURL = function(projectId) {
        return mmsAPIroot + '/projects/' + projectId + '/refs';
    };

    var getRefURL = function(projectId, refId) {
        return mmsAPIroot + '/projects/' + projectId + '/refs/' + refId;
    };

    var getRefHistoryURL = function(projectId, refId, timestamp) {
        if (timestamp !== '' && isTimestamp(timestamp)) {
            return mmsAPIroot + '/projects/' + projectId + '/refs/' + refId + '/commits' + '&maxTimestamp=' + timestamp + '&limit=1';
        }
        return mmsAPIroot + '/projects/' + projectId + '/refs/' + refId + '/commits';
    };

    var getGroupsURL = function(projectId, refId) {
        return mmsAPIroot + '/projects/' + projectId + '/refs/' + refId + '/groups';
    };

    /**
     * @ngdoc method
     * @name mms.URLService#getSiteProductsURL
     * @methodOf mms.URLService
     *
     * @description
     * Gets the url for all documents in a ref
     *
     * @param {object} reqOb object with keys as described in ElementService.
     * @returns {string} The url
     */
    var getProjectDocumentsURL = function(reqOb) {
        var r = mmsAPIroot + "/projects/" + reqOb.projectId +
            "/refs/" + reqOb.refId +
            "/documents";
        return addExtended(addVersion(r, reqOb.commitId), reqOb.extended);
    };

    /**
     * @ngdoc method
     * @name mms.URLService#getImageURL
     * @methodOf mms.URLService
     *
     * @description
     * Gets the url for querying an image url
     * (this is not the actual image path)
     *
     * @returns {string} The path for image url queries.
     */
    var getImageURL = function(reqOb) {
        var r = mmsAPIroot + '/projects/' + reqOb.projectId + '/refs/' + reqOb.refId + '/elements/' +
            reqOb.elementId;
        return addVersion(r, reqOb.commitId);
    };

    /**
     * @ngdoc method
     * @name mms.URLService#getElementURL
     * @methodOf mms.URLService
     *
     * @description
     * Gets the path for an element
     *
     * @param {object} reqOb object with keys as described in ElementService.
     * @returns {string} The url.
     */
    var getElementURL = function(reqOb) {
        var r = mmsAPIroot + '/projects/' + reqOb.projectId + '/refs/' + reqOb.refId + '/elements/' + reqOb.elementId;
        return addExtended(addVersion(r, reqOb.commitId), reqOb.extended);
    };

    var getViewElementIdsURL = function(reqOb) {
        var r = mmsAPIroot + '/projects/' + reqOb.projectId + '/refs/' + reqOb.refId + '/elements/' + reqOb.elementId + '/cfids';
        return r;
    };

    var getOwnedElementURL = function(reqOb) {
        var recurseString = 'recurse=true';
        if (reqOb.depth)
            recurseString = 'depth=' + reqOb.depth;
        var r = mmsAPIroot + '/projects/' + reqOb.projectId + '/refs/' + reqOb.refId + '/elements/' + reqOb.elementId;
        r = addVersion(r, reqOb.commitId);
        if (r.indexOf('?') > 0) {
            r += '&' + recurseString;
        } else {
            r += '?' + recurseString;
        }
        return addExtended(r, reqOb.extended);
    };

    /**
     * @ngdoc method
     * @name mms.URLService#getDocumentViewsURL
     * @methodOf mms.URLService
     *
     * @description
     * Gets the url to get all views in a document
     *
     * @param {object} reqOb object with keys as described in ElementService.
     * @returns {string} The url.
     */
    var getDocumentViewsURL = function(reqOb) {
        var r = mmsAPIroot + "/projects/" + reqOb.projectId + "/refs/" + reqOb.refId +
            '/documents/' + reqOb.elementId + "/views";
        r = addVersion(r, reqOb.commitId);
        return addExtended(r, reqOb.extended);
    };

    /**
     * @ngdoc method
     * @name mms.URLService#getElementVersionsURL
     * @methodOf mms.URLService
     *
     * @description
     * Gets the url to query for element history
     *
     * @param {object} reqOb object with keys as described in ElementService.
     * @returns {string} The url.
     */
    var getElementHistoryURL = function(reqOb) {
        return mmsAPIroot + '/projects/' + reqOb.projectId + '/refs/' + reqOb.refId + '/elements/' + reqOb.elementId + '/commits';
    };

    /**
     * @ngdoc method
     * @name mms.URLService#getPostElementsURL
     * @methodOf mms.URLService
     *
     * @description
     * Gets the path for posting element changes.
     *
     * @param {object} reqOb object with keys as described in ElementService.
     * @returns {string} The post elements url.
     */
    var getPostElementsURL = function(reqOb) {
        return addExtended(addChildViews(mmsAPIroot + '/projects/' + reqOb.projectId + '/refs/' + reqOb.refId + '/elements', reqOb.returnChildViews), reqOb.extended);
    };

    /**
     * @ngdoc method
     * @name mms.URLService#getPutElementsURL
     * @methodOf mms.URLService
     *
     * @description
     * Gets the path for getting multiple elements (using put with body).
     *
     * @param {object} reqOb object with keys as described in ElementService.
     * @returns {string} The post elements url.
     */
    var getPutElementsURL = function(reqOb) {
        var r = mmsAPIroot + '/projects/' + reqOb.projectId + '/refs/' + reqOb.refId + '/elements';
        return addExtended(addVersion(r, reqOb.commitId), reqOb.extended);
    };

    /**
     * @ngdoc method
     * @name mms.URLService#getElementSearchURL
     * @methodOf mms.URLService
     *
     * @description
     * Gets the url for element keyword search.
     *
     * @param {object} reqOb object with keys as described in ElementService.
     * @returns {string} The post elements url.
     */
    var getElementSearchURL = function(reqOb) {
        var r = mmsAPIroot + '/projects/' + reqOb.projectId + '/refs/' + reqOb.refId + '/search' + (reqOb.checkType ? '?checkType=true' : '');
        return addExtended(r, true);
    };

    /**
     * @ngdoc method
     * @name mms.URLService#getSearchURL
     * @methodOf mms.URLService
     *
     * @description
     * Gets the url for default search. Can optionally provide query parameters
     * i.e. `checkType=true&literal=true`
     *
     * @param {string} projectId Project Id
     * @param {string} refId Ref Id
     * @param {string} urlParams provide optional query parameters
     * @returns {string} The url with ticket
     */
    var getSearchURL = function(projectId, refId, urlParams) {
        var r;
        if (urlParams !== null || urlParams !== ''){
            // ie '/search?checkType=true&literal=true';
            r = mmsAPIroot + '/projects/' + projectId + '/refs/' + refId + '/search?' + urlParams;
        } else {
            r = mmsAPIroot + '/projects/' + projectId + '/refs/' + refId + '/search';
        }
        return r;
    };

    /**
     * @ngdocs method
     * @name mms.URLService#getArtifactURL
     * @methodOf mms.URLService
     *
     * @description
     * Gets the url for an artifact
     *
     * @param {object} reqOb object with keys
     * @returns {string} url
     */
    var getArtifactURL = function(reqOb) {
        var r = mmsAPIroot + '/projects/' + reqOb.projectId + '/refs/' + reqOb.refId + '/artifacts/' + reqOb.artifactId;
        return addVersion(r, reqOb.commitId);
    };

    /**
     * @ngdocs method
     * @name mms.URLService#getPutArtifactsURL
     * @methodOf mms.URLService
     *
     * @description
     * Gets the url for an artifact
     *
     * @param {object} reqOb object with keys
     * @returns {string} url
     */
    var getPutArtifactsURL = function(reqOb) {
        var r = mmsAPIroot + '/projects/' + reqOb.projectId + '/refs/' + reqOb.refId + '/artifacts';
        return addVersion(r, reqOb.commitId);
    };

    /**
     * @ngdocs method
     * @name mms.URLService#getArtifactHistoryURL
     * @methodOf mms.URLService
     *
     * @description
     * Gets the url for an artifact commit history
     *
     * @param {object} reqOb object with keys
     * @returns {string} url
     */
    var getArtifactHistoryURL = function(reqOb) {
        var r = mmsAPIroot + '/projects/' + reqOb.projectId + '/refs/' + reqOb.refId + '/artifacts/' + reqOb.artifactId + '/commits';
        return r;
    };

    var setJobsUrl = function(jobUrl) {
        jobsRoot = jobUrl + ':8443/';
    };

    var getJobsURL = function(projectId, refId, machine) {
        return addServer(jobsRoot + 'projects/'+ projectId + '/refs/' + refId + '/jobs', machine);
    };

    var getJobURL = function(projectId, refId, jobId, machine){
        return addServer(jobsRoot + 'projects/'+ projectId + '/refs/' + refId + '/jobs/' + jobId , machine);
    };

    var getRunJobURL = function(projectId, refId, jobId) {
        return jobsRoot + 'projects/'+ projectId + '/refs/' + refId + '/jobs/' + jobId + '/instances';
    };

    var getCreateJobURL = function(projectId, refId) {
        return jobsRoot + 'projects/'+ projectId + '/refs/' + refId + '/jobs';
    };

    var getJobInstancesURL = function(projectId, refId, jobId, machine) {
        return addServer(jobsRoot + 'projects/'+ projectId + '/refs/' + refId + '/jobs/' + jobId + '/instances', machine);
    };

    var getLogoutURL = function() {
        return mmsAPIroot + '/logout';
    };

    var getCheckTokenURL = function() {
        return mmsAPIroot + '/checklogin'; //TODO remove when server returns 404
    };

    var getCheckSessionURL = function() {
        return mmsAPIroot + '/api/version'; //TODO remove when server returns 404
    };

    var getPersonURL = function(username) {
        return mmsAPIroot + '/api/users/' + username;
    };

    /**
     * @ngdoc method
     * @name mms.URLService#handleHttpStatus
     * @methodOf mms.URLService
     *
     * @description
     * Utility for setting the state of a deferred object based on the status
     * of http error. The arguments are the same as angular's $http error
     * callback
     *
     * @param {Object} data The http response
     * @param {number} status Http return status
     * @param {Object} header Http return header
     * @param {Object} config Http config
     * @param {Object} deferred A deferred object that would be rejected
     *      with this object based on the http status:
     *      ```
     *          {
     *              status: status,
     *              message: http status message,
     *              data: data
     *          }
     *      ```
     */
    var handleHttpStatus = function(data, status, header, config, deferred) {
        var result = {status: status, data: data, message: ''};
        if (status === 404)
            result.message = "Not Found";
        else if (status === 500) {
            if (angular.isString(data) && data.indexOf("ENOTFOUND") >= 0)
                result.message = "Network Error (Please check network)";
            else
                result.message = "Server Error";
        } else if (status === 401 || status === 403)
            result.message = "Permission Error";
        else if (status === 409)
            result.message = "Conflict";
        else if (status === 400)
            result.message = "Bad Request";
        else if (status === 410)
            result.message = "Deleted";
        else if (status === 408)
            result.message = "Timed Out";
        else if (status === 501) {
            result.message = "Caching";
        } else
            result.message = "Timed Out (Please check network)";
        deferred.reject(result);
    };

    /**
     * @ngdoc method
     * @name mms.URLService#addServer
     * @methodOf mms.URLService
     *
     * @description
     * Adds mmsServer parameter to URL string, mainly used for PMA jobs
     *
     * @param {String} url The url string for which to add mmsServer parameter argument.
     * @param {String} server The mms server url for where elements are stored
     * @returns {string} The url with server parameter added.
     */
    var addServer = function(url, server) {
        if (url.indexOf('?') > 0)
            return url + '&mmsServer=' + server;
        else
            return url + '?mmsServer=' + server;
    };

    /**
     * @ngdoc method
     * @name mms.URLService#addVersion
     * @methodOf mms.URLService
     *
     * @description
     * Adds commitId parameter to URL string
     *
     * @param {String} url The url string for which to add version parameter argument.
     * @param {String} version The commit id
     * @returns {string} The url with commitId parameter added.
     */
    var addVersion = function(url, version) {
        if (version === 'latest')
            return url;
        else if (version) {
            if (url.indexOf('?') > 0)
                return url + '&commitId=' + version;
            else
                return url + '?commitId=' + version;
        }
        return url;
    };

    var addExtended = function(url, extended) {
        var r = url;
        if (!extended)
            return r;
        if (r.indexOf('?') > 0)
            r += '&extended=true';
        else
            r += '?extended=true';
        return r;
    };

    var addChildViews = function(url, add) {
        var r = url;
        if (!add)
            return r;
        if (r.indexOf('?') > 0)
            r += '&childviews=true';
        else
            r += '?childviews=true';
        return r;
    };


    return {
        getRoot: getRoot,
        setToken: setToken,
        getHeaders: getHeaders,
        getRequestConfig: getRequestConfig,
        getJMSHostname: getJMSHostname,
        getMmsServer: getMmsServer,
        isTimestamp: isTimestamp,
        getMmsVersionURL: getMmsVersionURL,
        getSiteDashboardURL: getSiteDashboardURL,
        getOrgURL: getOrgURL,
        getOrgsURL: getOrgsURL,
        getProjectsURL: getProjectsURL,
        getProjectURL: getProjectURL,
        getProjectMountsURL: getProjectMountsURL,
        getRefsURL: getRefsURL,
        getRefURL: getRefURL,
        getRefHistoryURL: getRefHistoryURL,
        getGroupsURL: getGroupsURL,
        getElementURL: getElementURL,
        getViewElementIdsURL: getViewElementIdsURL,
        getPutElementsURL: getPutElementsURL,
        getPostElementsURL: getPostElementsURL,
        getOwnedElementURL: getOwnedElementURL,
        getElementHistoryURL: getElementHistoryURL,
        getElementSearchURL: getElementSearchURL,
        getSearchURL: getSearchURL,
        getProjectDocumentsURL: getProjectDocumentsURL,
        getDocumentViewsURL: getDocumentViewsURL,
        getImageURL: getImageURL,
        getExportHtmlUrl: getExportHtmlUrl,
        getArtifactURL: getArtifactURL,
        getPutArtifactsURL: getPutArtifactsURL,
        getArtifactHistoryURL: getArtifactHistoryURL,
        setJobsUrl: setJobsUrl,
        getJobsURL: getJobsURL,
        getJobURL: getJobURL,
        getRunJobURL: getRunJobURL,
        getCreateJobURL: getCreateJobURL,
        getJobInstancesURL: getJobInstancesURL,
        getCheckLoginURL: getCheckLoginURL,
        getCheckTokenURL: getCheckTokenURL,
        getCheckSessionURL: getCheckSessionURL,
        getPersonURL: getPersonURL,
        getLogoutURL: getLogoutURL,
        handleHttpStatus: handleHttpStatus,
    };

}
