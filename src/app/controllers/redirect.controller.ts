import * as angular from 'angular';
var mmsApp = angular.module('mmsApp');


/* Controllers */
    // /workspaces/master/sites/{siteid}                    {siteid}_cover      /projects/{projectid}/master/document/{siteid}_cover
    // /workspaces/master/sites/{siteid}/document/{docid}   {docid}             /projects/{projectid}/master/document/{docid}
    // /workspaces/master/sites/{siteid}/documents/{docid}  {docid}             /projects/{projectid}/master/documents/{docid}
    // /workspaces/master/sites/{siteid}/documents/{docid}/views/{viewid} 
    // (view id might be the same as doc id)	            {docid},{viewid}	/projects/{projectid of doc}/master/documents/{docid}/views/{viewid}
    // if {viewid} not found, go to doc
    // if {docid} not found but view is found, it might be under a different doc 
    // (see _relatedDocuments of element in search result)
    // /workspaces/master/sites/{siteid}/documents/{docid}/full	{docid}	/projects/{projectid}/master/documents/{docid}/full

mmsApp.controller('RedirectCtrl', ['$scope', '$rootScope', '$state', '$location', '$timeout',
        'ProjectService', 'ElementService', 'growl', 
    function($scope, $rootScope, $state, $location, $timeout, ProjectService, ElementService, growl) {
        $rootScope.ve_title = 'View Editor'; //what to name this?
        $scope.redirect_noResults = false;
        $scope.redirect_element = null;
        $scope.spin = false;

        $scope.resetSelectPage = function() {
            $state.go('login.select');
        };

        var buildQuery = function(idList, projectList) {
            var queryOb = { 'query': { 'bool':{ "filter": [] } } };
            //Fitler master ref
            queryOb.query.bool.filter.push({ 'terms' : { 'id' : idList } });
            //Fitler project id
            queryOb.query.bool.filter.push({ 'terms' : { '_projectId' : projectList } });
            //Fitler master ref
            queryOb.query.bool.filter.push({ 'term' : { '_inRefIds' : 'master' } });
            return queryOb;
        };

        var errorHandler = function(reason) {
            $state.go('login.select');
        };

        var oldUrlTest = function(location) {
            var segments = location.split('/');
            var searchTermList = [], successRedirectFnc = errorHandler;
            var noResultFnc = function() {
                // TODO - Search for document was unsucessful. Please select from the following or contact admin to verify that document exists.
                $scope.redirect_noResults = true;
            };

            if (segments.length === 5) {
                if (location.includes('sites')) { //Search for site
                    searchTermList.push(segments[4]+'_cover');
                    successRedirectFnc = function(data) {
                        if ( data.length > 0 ) {
                            $scope.redirect_element = {name: data[0].name,
                                type: 'group',
                                link: "project.ref.preview({projectId:'" +data[0]._projectId+ "',refId:'master',documentId:'" +data[0].id+ "'})"
                            };
                            var redirectFnc = function() {
                                $state.go('project.ref.preview', {projectId: data[0]._projectId, refId: 'master', documentId: data[0].id});
                            };
                            $timeout(redirectFnc, 10000);
                        } else {
                            noResultFnc();
                        }
                    };
                }
            } else if (segments.length === 7) { //Search for document
                if (location.includes('documents')) {
                    // ["", "workspaces", "master", "sites", "site__18_0_6_eda034b_1489006578377_52061_121780", "document", "_18_0_6_bec02f9_1489697812908_180368_252005"]
                    searchTermList.push(segments[6]);
                    successRedirectFnc = function(data) {
                        if ( data.length > 0 ) {
                            $scope.redirect_element = {name: data[0].name,
                                type: 'doc',
                                link: "project.ref.document({projectId:'" +data[0]._projectId+ "',refId:'master',documentId:'" +data[0].id+ "'})"
                            };
                            var redirectFnc = function() {
                                $state.go('project.ref.document', {projectId: data[0]._projectId, refId: 'master', documentId: data[0].id});
                            };
                            $timeout(redirectFnc, 10000);
                        } else {
                            noResultFnc();
                        }
                    };
                } else if (location.includes('document')) {
                    searchTermList.push(segments[6]);
                    successRedirectFnc = function(data) {
                        if ( data.length > 0 ) {
                            $scope.redirect_element = {name: data[0].name,
                                type: 'doc',
                                link: "project.ref.preview({projectId:'" +data[0]._projectId+ "',refId:'master',documentId:'" +data[0].id+ "'})"
                            };
                            var redirectFnc = function() {
                                $state.go('project.ref.preview', {projectId: data[0]._projectId, refId: 'master', documentId: data[0].id});
                            };
                            $timeout(redirectFnc, 10000);
                        } else {
                            noResultFnc();
                        }
                    };
                }
            } else if (segments.length === 9) { //Search for view
                if (location.includes('views')) {
                    // ["", "workspaces", "master", "sites", "site__18_0_6_eda034b_1489006578377_52061_121780", "documents", "_18_0_6_bec02f9_1489697812908_180368_252005", "views", "MMS_1474405796233_0887698d-1fc7-47ac-87ac-b0f6e7b69d35"]
                    if (segments[6] == segments[8]) {
                        searchTermList.push(segments[6]);
                        successRedirectFnc = function(data) {
                            if ( data.length > 0 ) {
                                $scope.redirect_element = {name: data[0].name,
                                    type: 'doc',
                                    link: "project.ref.document.view({projectId:'" +data[0]._projectId+ "',refId:'master',documentId:'" +data[0].id+ "',viewId:'" +data[0].id+ "'})"
                                };
                                var redirectFnc = function() {
                                    $state.go('project.ref.document.view', {projectId: data[0]._projectId, refId: 'master', documentId: data[0].id, viewId: data[0].id});
                                };
                                $timeout(redirectFnc, 10000);
                            } else {
                                noResultFnc();
                            }
                        };
                    } else {
                        searchTermList.push(segments[6]);
                        searchTermList.push(segments[8]);
                        successRedirectFnc = function(data) {
                            var redirectFnc;
                            if (data.length > 1) {
                                if ( data[0].id === segments[6] && data[1].id === segments[8] ) {
                                    //should check case if data[1] is segent[6] also
                                    $scope.redirect_element = {name: data[0].name,
                                        type: 'doc',
                                        link: "project.ref.document.view({projectId:'" +data[0]._projectId+ "',refId:'master',documentId:'" +data[0].id+ "',viewId:'" +data[1].id+ "'})"
                                    };
                                    redirectFnc = function() {
                                        $state.go('project.ref.document.view', {projectId: data[0]._projectId, refId: 'master', documentId: data[0].id, viewId: data[1].id});
                                    };
                                } else if ( data[0].id === segments[8] && data[1].id === segments[6] ) {
                                    //should check case if data[1] is segent[6] also
                                    $scope.redirect_element = {name: data[0].name,
                                        type: 'doc',
                                        link: "project.ref.document.view({projectId:'" +data[0]._projectId+ "',refId:'master',documentId:'" +data[1].id+ "',viewId:'" +data[0].id+ "'})"
                                    };
                                    redirectFnc = function() {
                                        $state.go('project.ref.document.view', {projectId: data[0]._projectId, refId: 'master', documentId: data[1].id, viewId: data[0].id});
                                    };
                                }
                                $timeout(redirectFnc, 10000);
                            } else if (data.length > 0) {
                                if ( data[0].id === segments[8] ) {
                                    $scope.elem = data[0];
                                    $scope.redirect_relatedDocs = data[0]._relatedDocuments;
                                } else if ( data[0].id === segments[6] ) {
                                    $scope.redirect_element = {name: data[0].name,
                                        type: 'doc',
                                        link: "project.ref.document({projectId:'" +data[0]._projectId+ "',refId:'master',documentId:'" +data[0].id+ "'})"
                                    };
                                    redirectFnc = function() {
                                        $state.go('project.ref.document', {projectId: data[0]._projectId, refId: 'master', documentId: data[0].id});
                                    };
                                    $timeout(redirectFnc, 10000);
                                }
                            } else {
                                noResultFnc();
                            }
                        };
                    }
                }
            } else if (segments.length === 8) { //Search for full doc
                if (location.includes('full')) {
                    searchTermList.push(segments[6]);
                    successRedirectFnc = function(data) {
                        if ( data.length > 0 ) {
                            $scope.redirect_element = {name: data[0].name,
                                type: 'doc',
                                link: "project.ref.document.full({projectId:'" +data[0]._projectId+ "',refId:'master',documentId:'" +data[0].id+ "'})"
                            };
                            var redirectFnc = function() {
                                $state.go('project.ref.document.full', {projectId: data[0]._projectId, refId: 'master', documentId: data[0].id});
                            };
                            $timeout(redirectFnc, 10000);
                        } else {
                            noResultFnc();
                        }
                    };
                }
            }
            // console.log(segments);
            var queryOb = buildQuery(searchTermList, projectList);
            ElementService.search(reqOb, queryOb)
            .then(successRedirectFnc, errorHandler);
        };

        var projectList = [];
        var reqOb = {};
        ProjectService.getProjects().then(function(projectObs) {
            projectList = projectObs.map(function(a) {return a.id;});
            reqOb = {projectId: projectList[0], refId: 'master'};
            oldUrlTest($scope.crush_url);
        });
}]);