'use strict';

angular.module('mms')
.factory('ProjectService', ['$q','$http','ApplicationService','CacheService','ElementService','URLService','_', ProjectService]);

/**
 * @ngdoc service
 * @name mms.ProjectService
 * @requires $q
 * @requires $http
 * @requires mms.ApplicationService
 * @requires mms.CacheService
 * @requires mms.ElementService
 * @requires mms.URLService
 * @requires _
 *
 * @description
 * This is a utility service for getting project, ref, commit information
 */
function ProjectService($q, $http,ApplicationService,CacheService,ElementService,URLService,_) {
    var inProgress = {};

    /**
     * @ngdoc method
     * @name mms.ProjectService#getOrg
     * @methodOf mms.ProjectService
     *
     * @description
     * Gets org information from mms
     *
     * @param {string} orgId id of org
     * @returns {Promise} Resolves to the org object.
     */
    var getOrg = function(orgId) {
        var deferred = $q.defer();
        var key = ['org', orgId];
        var urlkey = URLService.getOrgURL(orgId);
        if (inProgress.hasOwnProperty(urlkey)) {
            return inProgress[urlkey];
        }
        if (CacheService.exists(key)) {
            deferred.resolve(CacheService.get(key));
        } else {
            inProgress[urlkey] = deferred.promise;
            $http.get(urlkey)
            .then(function(response) {
                if (!response.data.orgs || response.data.orgs.length < 1) {
                    deferred.reject({status: 404, data: '', message: 'Org not found'});
                } else {
                    CacheService.put(key, response.data.orgs[0], true);
                    deferred.resolve(CacheService.get(key));
                }
            }, function(response) {
                URLService.handleHttpStatus(response.data, response.status, response.headers, response.config, deferred);
            }).finally(function() {
                delete inProgress[urlkey];
            });
        }
        return deferred.promise;
    };

    /**
     * @ngdoc method
     * @name mms.ProjectService#getOrgs
     * @methodOf mms.ProjectService
     * 
     * @description
     * Gets orgs information
     *
     * @returns {Promise} Resolves into array of org objects.
     */
    var getOrgs = function() {
        var key = 'orgs';
        if (inProgress.hasOwnProperty(key)) {
            return inProgress[key];
        }
        var deferred = $q.defer();
        if (CacheService.exists(key)) {
            deferred.resolve(CacheService.get(key));
        } else {
            inProgress[key] = deferred.promise;
            $http.get(URLService.getOrgsURL())
            .then(function(response) {
                var orgs = [];
                for (var i = 0; i < response.data.orgs.length; i++) {
                    var org = response.data.orgs[i];
                    CacheService.put(['org', org.id], org, true);
                    orgs.push(CacheService.get(['org', org.id]));
                }
                CacheService.put(key, orgs, false);
                deferred.resolve(CacheService.get(key));
            }, function(response) {
                URLService.handleHttpStatus(response.data, response.status, response.headers, response.config, deferred);
            }).finally(function() {
                delete inProgress[key];
            });
        }
        return deferred.promise;
    };

    var getProjects = function(orgId) {
        var deferred = $q.defer();
        var url = URLService.getProjectsURL();
        if (inProgress.hasOwnProperty(url)) {
            return inProgress[url];
        }
        var cacheKey = !orgId ? 'projects' : ['projects', orgId];
        if (CacheService.exists(cacheKey)) {
            deferred.resolve(CacheService.get(cacheKey));
        } else {
            inProgress[url] = deferred.promise;
            $http.get(url).then(function(response) {
                if (!angular.isArray(response.data.projects)) {
                    deferred.reject({status: 500, data: '', message: "Server Error: empty response"});
                    return;
                }
                var orgProjects = {};
                for (var i = 0; i < response.data.projects.length; i++) {
                    var project = response.data.projects[i];
                    var porg = project.orgId;
                    CacheService.put(['project', project.id], project, true);
                    if(orgProjects[porg] === undefined) {
                        orgProjects[porg] = [];
                    }
                    orgProjects[porg].push(CacheService.get(['project', project.id]));
                }
                $.each(orgProjects, function(i, val) {
                    var orgCacheKey = ['projects', i];
                    CacheService.put(orgCacheKey, val, false);
                });                
                deferred.resolve(CacheService.get(cacheKey));
            }, function(response) {
                URLService.handleHttpStatus(response.data, response.status, response.headers, response.config, deferred);
            }).finally(function() {
                delete inProgress[url];
            });
        }
        return deferred.promise;
    };

    var getProject = function(projectId) {
        var deferred = $q.defer();
        var url = URLService.getProjectURL(projectId);
        if (inProgress.hasOwnProperty(url)) {
            return inProgress[url];
        }
        var cacheKey = ['project', projectId];
        if (CacheService.exists(cacheKey))
            deferred.resolve(CacheService.get(cacheKey));
        else {
            inProgress[url] = deferred.promise;
            $http.get(url).then(function(response) {
                if (!angular.isArray(response.data.projects) || response.data.projects.length === 0) {
                    deferred.reject({status: 500, data: '', message: "Server Error: empty response"});
                    return;
                }
                CacheService.put(cacheKey, response.data.projects[0], true);
                deferred.resolve(CacheService.get(cacheKey));
            }, function(response) {
                URLService.handleHttpStatus(response.data, response.status, response.headers, response.config, deferred);
            }).finally(function() {
                delete inProgress[url];
            });
        }
        return deferred.promise;
    };

    var getProjectMounts = function(projectId, refId) {
        var deferred = $q.defer();
        var url = URLService.getProjectMountsURL(projectId, refId);
        if (inProgress.hasOwnProperty(url)) {
            return inProgress[url];
        }
        var cacheKey = ['project', projectId, refId];
        if (CacheService.exists(cacheKey)) {
            deferred.resolve(CacheService.get(cacheKey));
        } else {
            inProgress[url] = deferred.promise;
            $http.get(url).then(function(response) {
                if (!angular.isArray(response.data.projects) || response.data.projects.length === 0) {
                    deferred.reject({status: 500, data: '', message: "Server Error: empty response"});
                    return;
                }
                CacheService.put(cacheKey, response.data.projects[0], true);
                deferred.resolve(CacheService.get(cacheKey));
            }, function(response) {
                URLService.handleHttpStatus(response.data, response.status, response.headers, response.config, deferred);
            }).finally(function() {
                delete inProgress[url];
            });
        }
        return deferred.promise;
    };

    var getRefs = function(projectId) {
        var cacheKey = ['refs', projectId];
        var url = URLService.getRefsURL(projectId);
        if (inProgress.hasOwnProperty(url)) {
            return inProgress[url];
        }
        var deferred = $q.defer();
        if (CacheService.exists(cacheKey)) {
            deferred.resolve(CacheService.get(cacheKey));
        } else {
            inProgress[url] = deferred.promise;
            $http.get(url).then(function(response) {
                if (!angular.isArray(response.data.refs)) {
                    deferred.reject({status: 500, data: '', message: "Server Error: empty response"});
                    return;
                }
                var refs = [];
                for (var index = 0; index < response.data.refs.length; index++) {
                    var ref = response.data.refs[index];
                    if (ref.id === 'master') {
                        ref.type = 'Branch';
                    }
                    CacheService.put(['ref', projectId, ref.id], ref, true);
                    refs.push(CacheService.get(['ref', projectId, ref.id]));
                }
                CacheService.put(cacheKey, refs, false);
                deferred.resolve(CacheService.get(cacheKey));
            }, function(response) {
                URLService.handleHttpStatus(response.data, response.status, response.headers, response.config, deferred);
            }).finally(function() {
                delete inProgress[url];
            });
        }
        return deferred.promise;
    };

    var getRef = function(refId, projectId) {
        var deferred = $q.defer();
        getRefs(projectId).then(function(data) {
            var result = CacheService.get(['ref', projectId, refId]);
            if (result) {
                deferred.resolve(result);
            } else {
                deferred.reject({status: 404, data: '', message: "Ref not found"});
            }
        }, function(reason) {
            deferred.reject(reason);
        });
        return deferred.promise;
    };

    var getRefHistory = function(refId, projectId, timestamp) {
        var deferred = $q.defer();
        var url;
        if (timestamp !== null) {
            url = URLService.getRefHistoryURL(projectId, refId, timestamp);
        } else {
            url = URLService.getRefHistoryURL(projectId, refId);
        }
        inProgress[url] = deferred.promise;
        $http.get(url).then(function(response) {
            if (!angular.isArray(response.data.commits) || response.data.commits.length === 0) {
                deferred.reject({status: 500, data: '', message: "Error: Project does not exist at specified time."});
                return;
            }
            deferred.resolve(response.data.commits);
        }, function(response) {
            URLService.handleHttpStatus(response.data, response.status, response.headers, response.config, deferred);
        }).finally(function() {
            delete inProgress[url];
        });
        return deferred.promise;
    };

    var createRef = function(refOb, projectId) {
        var deferred = $q.defer();
        var url = URLService.getRefsURL(projectId);
        $http.post(url, {'refs': [refOb], 'source': ApplicationService.getSource()})
        .then(function(response) {
            if (!angular.isArray(response.data.refs) || response.data.refs.length === 0) {
                deferred.reject({status: 500, data: '', message: "Server Error: empty response"});
                return;
            }
            var createdRef = response.data.refs[0];
            var list = CacheService.get(['refs', projectId]);
            if (list) {
                list.push(createdRef);
            }
            deferred.resolve(CacheService.put(['ref', projectId, createdRef.id], createdRef));
        }, function(response) {
            URLService.handleHttpStatus(response.data, response.status, response.headers, response.config, deferred);
        });
        return deferred.promise;
    };

    var updateRef = function(refOb, projectId) {
        var deferred = $q.defer();
        var url = URLService.getRefsURL(projectId);
        $http.post(url, {'refs': [refOb], 'source': ApplicationService.getSource()})
        .then(function(response) {
            if (!angular.isArray(response.data.refs) || response.data.refs.length === 0) {
                deferred.reject({status: 500, data: '', message: "Server Error: empty response"});
                return;
            }
            var resp = response.data.refs[0];
            deferred.resolve(CacheService.put(['ref', projectId, resp.id], resp, true));
        }, function(response) {
            URLService.handleHttpStatus(response.data, response.status, response.headers, response.config, deferred);
        });
        return deferred.promise;
    };

    var deleteRef = function(refId, projectId) {
        var deferred = $q.defer();
        var url = URLService.getRefURL(projectId, refId);
        $http.delete(url).then(function(response) {
            var key = ['ref', projectId, refId];
            var refOb = CacheService.get(key);
            if (refOb) {
                CacheService.remove(key);
                var list = CacheService.get(['refs', projectId]);
                if (list) {
                    for (var i = 0; i < list.length; i++) {
                        if (list[i].id === refOb.id) {
                            list.splice(i, 1);
                            break;
                        }
                    }
                }
            }
            deferred.resolve('');
        }, function(response) {
            URLService.handleHttpStatus(response.data, response.status, response.headers, response.config, deferred);
        });
        return deferred.promise;
    };

    var getGroups = function(projectId, refId) {
        refId = refId ? refId : 'master';
        var cacheKey = ['groups', projectId, refId];
        var url = URLService.getGroupsURL(projectId, refId);
        if (inProgress.hasOwnProperty(url)) {
            return inProgress[url];
        }
        var deferred = $q.defer();
        if (CacheService.exists(cacheKey)) {
            deferred.resolve(CacheService.get(cacheKey));
        } else {
            inProgress[url] = deferred.promise;
            $http.get(url).then(function(response) {
                if (!angular.isArray(response.data.groups)) {
                    deferred.reject({status: 500, data: '', message: "Server Error: empty response"});
                    return;
                }
                var groups = [];
                var reqOb = {projectId: projectId, refId: refId, commitId: 'latest'};
                for (var i = 0; i < response.data.groups.length; i++) {
                    var group = response.data.groups[i];
                    reqOb.elementId = group.id;
                    group = ElementService.cacheElement(reqOb, group, false);
                    CacheService.put(['group', projectId, refId, group.id], group, true);
                    groups.push(CacheService.get(['group', projectId, refId, group.id]));
                }
                CacheService.put(cacheKey, groups, false);
                deferred.resolve(CacheService.get(cacheKey));
            }, function(response) {
                URLService.handleHttpStatus(response.data, response.status, response.headers, response.config, deferred);
            }).finally(function() {
                delete inProgress[url];
            });
        }
        return deferred.promise;
    };

    var getGroup = function(id, projectId, refId) {
        var deferred = $q.defer();
        getGroups(projectId, refId).then(function(data) {
            var result = CacheService.get(['group', projectId, refId, id]);
            if (result) {
                deferred.resolve(result);
            } else {
                deferred.reject({status: 404, data: '', message: "Group not found"});
            }
        }, function(reason) {
            deferred.reject(reason);
        });
        return deferred.promise;
    };

    // var getMetatypes = function(projectId, refId) {
    //     refId = refId ? refId : 'master';
    //     var cacheKey = ['metatypes', projectId, refId];
    //     var url = URLService.getSearchURL(projectId, refId);
    //     if (inProgress.hasOwnProperty(url)) {
    //         return inProgress[url];
    //     }
    //     var deferred = $q.defer();
    //     if (CacheService.exists(cacheKey)) {
    //         deferred.resolve(CacheService.get(cacheKey));
    //     } else {
    //         inProgress[url] = deferred.promise;
    //         var query = getMetatypeFilter(projectId, refId);
    //         $http.post(url, query).then(function(response) {
    //             var aggregations = response.data.aggregations;
    //             if (!angular.isDefined(aggregations)) {
    //                 deferred.reject({status: 500, data: '', message: "Could not find metatypes"});
    //                 return;
    //             }
    //             var metatypeList = [];
    //             // Get metatype buckets for `types` and add to metatype list
    //             var typeIds = aggregations.elements.types.buckets;
    //             var typeKeyList = _.map(typeIds, function(obj){ return {id: obj.key, name: obj.key}; });
    //             metatypeList = typeKeyList;
    //             // Get metatype buckets for `stereotypedElements` and get elements
    //             // before adding to metatype list (need name for dropdown)
    //             var stereotypeIds = aggregations.stereotypedElements.stereotypeIds.buckets;
    //             var stereotypeKeyList = _.pluck(stereotypeIds, 'key');
    //             var reqOb = {elementIds: stereotypeKeyList, projectId: projectId, refId: refId};
    //             ElementService.getElements(reqOb,2).then(function(data) {
    //                 var steroObjList = _.map(data, function(obj){ return {id: obj.id, name: obj.name}; });
    //                 metatypeList = metatypeList.concat(steroObjList);
    //                 CacheService.put(cacheKey, metatypeList, false);
    //                 deferred.resolve(CacheService.get(cacheKey));
    //             });
    //         }, function(response) {
    //             URLService.handleHttpStatus(response.data, response.status, response.headers, response.config, deferred);
    //         }).finally(function() {
    //             delete inProgress[url];
    //         });
    //     }
    //     return deferred.promise;
    // };

    // /**
    //  * List of appliedSterotypes and types to not include in metatype search dropdown
    //  */
    // var metatypeFilterMustNotList = [
    //     {
    //         "terms": {
    //             "_appliedStereotypeIds": ["_17_0_5_407019f_1336584858932_290814_11897", "_17_0_2_407019f_1354126823633_971278_12922", "_17_0_2_3_407019f_1390932205525_919663_29081", "_17_0_1_407019f_1328144768208_151103_11611", "_18_5_8bf0285_1486490948776_422870_16475", "_17_0_2_3_407019f_1380044908011_537162_29414", "_18_0_6_8bf0285_1480702282066_678566_13974", "_18_0_5_407019f_1470005595314_374414_14088", "_17_0_1_407019f_1320688868391_878682_2122", "_17_0_5_407019f_1334873987130_64195_11860", "_17_0_1_244d03ea_1319490838789_76536_23321", "_17_0_1_244d03ea_1319490696098_585884_23244", "_17_0_1_244d03ea_1319490675924_494597_23220", "_17_0_2_3_e81034b_1378849795852_475880_29502", "_17_0_1_244d03ea_1319490856319_735016_23345", "_17_0_5_407019f_1346952773459_128964_11915", "_17_0_1_244d03ea_1319492675769_542703_24690", "_17_0_1_244d03ea_1319490805237_397889_23292", "_17_0_1_244d03ea_1319491813759_405316_23859", "_17_0_1_22b603cd_1319577320837_597116_24044", "_17_0_1_244d03ea_1319490870282_714178_23369", "_17_0_1_244d03ea_1319490921274_829705_23417", "_17_0_2_3_e81034b_1378849355455_639118_29417", "_17_0_1_244d03ea_1319490658057_783239_23196", "_17_0_1_244d03ea_1319490607459_890787_23148", "_17_0_1_244d03ea_1319490639053_446661_23172", "_17_0_1_24c603f9_1318965749289_636288_15241", "_17_0_1_244d03ea_1319490721410_468874_23268", "_17_0_1_244d03ea_1319490880431_889010_23393", "_17_0_2_3_407019f_1377878750778_198079_29401", "_17_0_2_3_407019f_1377881591361_754431_29966", "_17_0_5_407019f_1337970852079_693660_12393", "_17_0_2_3_407019f_1377878719961_37575_29374", "_17_0_1_24c603f9_1318965764947_847626_15265", "_17_0_2_1_407019f_1358445062164_196970_12977", "_17_0_1_244d03ea_1319496225382_275996_25443", "_17_0_1_244d03ea_1319498258297_961829_27083", "_17_0_1_244d03ea_1319496302084_771803_25570", "_17_0_1_244d03ea_1319496280368_246829_25514", "_18_5_2_8bf0285_1506039168690_925234_16001", "_17_0_1_407019f_1326235066484_404532_2489", "_17_0_1_244d03ea_1319512564304_251824_28229", "_18_0_5_ef50357_1480453603002_831462_13966", "_17_0_2_3_407019f_1383246724224_41450_29079", "_17_0_2_3_407019f_1375477696989_696093_29350", "_17_0_2_3_407019f_1375478079564_152907_29404", "_17_0_2_3_407019f_1392933505529_270043_29089", "_17_0_2_3_e9f034d_1375474838719_217024_29345", "_17_0_2_3_eac0346_1374702066208_763130_29330", "_17_0_2_3_eac0346_1374701945748_238477_29309", "_17_0_2_3_407019f_1383165357327_898985_29071", "_9_0_be00301_1108044380615_150487_0", "_10_0_622020d_1127207234373_259585_1", "_12_1_8f90291_1173963323875_662612_98", "_16_0_62a020a_1227788740027_441955_240", "_17_0_2_3_ff3038a_1383749269646_31940_44489", "_16_5beta1_8ba0276_1232443673758_573873_267", "_9_0_be00301_1108044563999_784946_1", "_11_5EAPbeta_be00301_1151484491369_618395_1", "_15_5EAPbeta1_8f90291_1207743469046_796042_162", "_18_0beta_8e8028e_1384177586203_506524_3245", "_9_0_be00301_1108044721245_236588_411", "_17_0_2beta_903028d_1330931963982_116619_1920", "_18_5beta_8ba0279_1468931052415_679497_4210", "_17_0_2beta_903028d_1330931963978_770627_1918", "_18_1_8760276_1416414449210_764904_3981", "_17_0_5beta_f720368_1373961709543_89140_3280", "_9_0_be00301_1108044705753_203399_228"]
    //         }
    //     },
    //     {
    //         "terms": {
    //             "type": ["Dependency", "Abstraction", "ComponentRealization", "InterfaceRealization", "Deployment", "Manifestation", "Realization", "Substitution", "Usage", "ElementImport", "Extend", "Include", "InformationFlow", "PackageImport", "ProfileApplication", "ProtocolConformance", "TemplateBinding", "Generalization", "Association", "Connector", "ConnectorEnd", "ControlFlow", "ObjectFlow", "Mount", "FinalNode", "JoinNode", "ForkNode", "MergeNode", "FlowFinalNode", "InitialNode", "ActivityFinalNode", "ActivityPartition", "DecisionNode", "Transition"]
    //         }
    //     }
    // ];

    // var getMetatypeFilter = function(projectId, refId) {
    //     return {
    //     "size": 0,
    //     "aggs": {
    //       "stereotypedElements": {
    //           "filter": { "bool": {
    //               "must": [
    //                   {"term": {"_projectId": projectId}},
    //                   {"term": {"_inRefIds": refId}},
    //                   {"exists": {"field": "_appliedStereotypeIds"}}
    //               ],
    //               "must_not": metatypeFilterMustNotList
    //           }},
    //           "aggs": {
    //               "stereotypeIds": {
    //                   "terms": {
    //                       "field": "_appliedStereotypeIds",
    //                       "size": 20
    //                   }
    //               }
    //           }
    //       },
    //      "elements": {
    //           "filter": { "bool": {
    //               "must": [
    //                   {"term": {"_projectId": projectId}},
    //                   {"term": {"_inRefIds": refId}}
    //               ],
    //              "must_not" : metatypeFilterMustNotList
    //           }},
    //           "aggs": {
    //               "types": {
    //                   "terms": {
    //                       "field": "type",
    //                       "size": 20
    //                   }
    //               }
    //           }
    //       }
    //     }
    //   };
    // };

    var reset = function() {
        inProgress = {};
    };


    return {
        getProjects: getProjects,
        getProject: getProject,
        getProjectMounts: getProjectMounts,
        getOrgs: getOrgs,
        getOrg: getOrg,
        getRefs: getRefs,
        getRef: getRef,
        getRefHistory: getRefHistory,
        getGroups: getGroups,
        getGroup: getGroup,
        createRef: createRef,
        updateRef: updateRef,
        deleteRef: deleteRef,
        //getMetatypes: getMetatypes,
        reset: reset
    };
}