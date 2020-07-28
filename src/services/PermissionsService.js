'use strict';

angular.module('mms')
.factory('PermissionsService', ['$q', '$http', 'URLService', 'CacheService', '_', PermissionsService]);


/**
 * @ngdoc service
 * @name mms.PermissionsService
 *
 * @description
 * This utility service handles permissions inquiries
 */
function PermissionsService($q, $http, URLService, CacheService, _) {

    var permissions = {project: {}, ref:{}};

    var initializePermissions = function(projectOb, refOb) {
        var url = URLService.getPermissionsLookupURL();
       
        var deferred = $q.defer();                

        $http.put(url, { "lookups" : [ 
            {
                "type" : "PROJECT",
                "projectId": projectOb.id,
                "privilege": "PROJECT_EDIT"
            },
            {
                "type" : "BRANCH",
                "projectId": refOb._projectId,
                "refId": refOb.id,
                "privilege": "BRANCH_EDIT_CONTENT"
            }
         ] })
        .then(function(response) {
            var data = response.data.lookups;
            if (angular.isArray(data) && data.length > 0) {
                for(var i in data) {
                    var d = data[i];                    
                    if(d.type == 'PROJECT'){
                        permissions.project[d.projectId] = d.hasPrivilege;                        
                    } else {
                        permissions.ref[d.projectId + '/' + d.refId] = d.hasPrivilege;
                    }                    
                }                
                deferred.resolve(permissions);
            } else {
                deferred.reject({status: 500, data: '', message: "Server Error: empty response"});
            }
        }, function(response) {
            URLService.handleHttpStatus(response.data, response.status, response.headers, response.config, deferred);
        });   
        
        return deferred.promise;
    };

    var hasProjectEditPermission = function(projectOb) {
        return permissions.project[projectOb];
    };

    var hasBranchEditPermission = function(refOb) {
        return hasProjectIdBranchIdEditPermission(refOb._projectId, refOb.id);
    };

    var hasProjectIdBranchIdEditPermission = function(projectId, refId) {
        return permissions.ref[projectId + "/" + refId];
    };
  
    return {
        initializePermissions: initializePermissions,
        hasProjectEditPermission: hasProjectEditPermission,
        hasBranchEditPermission: hasBranchEditPermission,
        hasProjectIdBranchIdEditPermission: hasProjectIdBranchIdEditPermission
    };

}